/**
 * @author Kyle Lopes <kyle.lopes@scscloud.com>
 * @version 2022-12-20
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @NScriptType UserEventScript
 **/

define(['N/record', 'N/redirect', 'N/url', 'N/query', 'N/search', '../Library/scs-library-2'],

    /**
     *
     * @param {record} record
     * @param {redirect} redirect
     * @param {url} url
     * @param {query} query
     * @param {scsLibrary} scsLibrary
     * @returns { { beforeLoad: beforeLoad,beforeSubmit: beforeSubmit } }
     */
    (record, redirect, url, query, search, scsLibrary) => {

        const beforeLoad = context => {
            try {
                const approve = context.request && context.request.parameters && context.request.parameters.custparam_approved ? true : false;
                log.debug(context.type)
                if (context.type == context.UserEventType.VIEW) {
                    setApproved(approve, context.newRecord);
                    addApproveButton(context.form, context.newRecord);
                }

                if (context.type == context.UserEventType.COPY) {
                    clearFields(context.newRecord);
                }

            } catch (error) {
                log.error('beforeLoad', error.toJSON ? error : error.toString());
            }
        }


        const beforeSubmit = context => {
            try {
                if (context.type == context.UserEventType.CREATE) {
                    checkForPriceDifference(context.newRecord);
                }
            } catch (error) {
                log.error('beforeLoad', error.toJSON ? error : error.toString());
            }
        }

        /**
         * This function checks whether or not there is a difference between the current & last purchase price by vendor.
         * This is needed to determine whether a PO can be auto approved or not.
         *
         * @param {*} newRecord
         * @returns {boolean}
         */
        const checkForPriceDifference = (newRecord) => {
            const results = getLastPurchasePricePerVendor(newRecord);

            const lineCount = newRecord.getLineCount({ sublistId: 'item' });

            let sameRateCount = 0;
            let approved = false;

            for (let i = 0; i < lineCount; i++) {
                const itemId = newRecord.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                const rate = newRecord.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: i });

                for (let j = 0; j < results.length; j++) {

                    if (itemId == results[j].itemId) {
                        if (rate == results[j].lastPurchasePrice) {
                            sameRateCount++;
                        }
                    }
                }
            }

            if (sameRateCount == lineCount) approved = true;

            newRecord.setValue({ fieldId: 'custbody_approved', value: approved });
        }

        /**
         * This is done in a search and in a query. Query gets the most recent purchase order for that vendor.
         * The search then gets the rate for that record for that item. Doing it in one search was not possible
         *
         * @param {*} newRecord
         * @returns {array}
         */
        const getLastPurchasePricePerVendor = (newRecord) => {
            let searchResults = [];
            const results = [];
            const itemIds = [];
            const vendor = newRecord.getValue({ fieldId: 'entity' });

            for (let i = 0; i < newRecord.getLineCount({ sublistId: 'item' }); i++) {
                const itemId = newRecord.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });

                itemIds.push(itemId);
                results.push({ itemId: itemId, lastPurchasePrice: 0 });
            }

            log.debug('itemId', itemIds);

            const filters = getFilters(vendor, itemIds);

            if (filters.length > 0) {
                searchResults = getLastPurchasePrice(filters);
            }

            for (let i in searchResults) {
                const itemId = searchResults[i].getValue({ name: 'item' });
                const lastPurchasePrice = searchResults[i].getValue({ name: 'fxrate' });
                for (let j in results) {
                    if (results[j].itemId == itemId) {
                        results[j].lastPurchasePrice = lastPurchasePrice;
                    }
                }
            }

            return results;
        }

        /**
         * Gets the most recent purchase order for that vendor creates filters with itemId and transaction internal id.
         *
         *
         * @param {*} vendor
         * @param {*} itemIds
         * @returns {array}
         */
        const getFilters = (vendor, itemIds) => {
            const filters = [];

            const results = query.runSuiteQL(`
            SELECT  tl.item,
                    MAX(t.id) id

            FROM transaction t
            JOIN transactionline tl ON tl.transaction = t.id

            WHERE tl.item IN(${itemIds.join(', ')})
            AND   t.entity = ${vendor}
            AND   t.recordtype = 'purchaseorder'

            GROUP BY tl.item
        `).asMappedResults();

            for (let i = 0; i < results.length; i++) {

                if (i > 0) {
                    filters.push('OR');
                }

                filters.push([
                    ['item', 'anyof', results[i].item], 'AND',
                    ['internalid', 'anyof', results[i].id]
                ]);
            }

            return filters;
        }

        /**
         * Gets the last purchase price in dollars for specified items and internalids
         *
         * @param {*} filters
         * @returns {array}
         */
        const getLastPurchasePrice = (filters) => {
            const columns = [
                search.createColumn({ name: 'item' }),
                search.createColumn({ name: 'fxrate' })
            ];

            return scsLibrary.search({ searchType: 'purchaseorder', filters: filters, columns: columns });
        }

        /**
         * Add approved button if not approved
         *
         * @param {*} form
         * @param {*} newRecord
         */
        const addApproveButton = (form, newRecord) => {
            const isApproved = newRecord.getValue({ fieldId: 'custbody_approved' });
            if (!isApproved) {
                const recordUrl = url.resolveRecord({
                    recordId: newRecord.id,
                    recordType: newRecord.type,
                    params: {
                        custparam_approved: 'T'
                    }
                });

                form.addButton({
                    id: 'custpage_approve_button',
                    label: 'Approve Purchase Order',
                    functionName: `function approve() {
                            window.location="${recordUrl}";
                        } approve();`
                })
            }
        }

        /**
         * Approves a record via the custom approve button
         *
         * @param {boolean} approve
         * @param {*} newRecord
         */
        const setApproved = (approve, newRecord) => {
            if (approve) {
                record.submitFields({
                    type: newRecord.type,
                    id: newRecord.id,
                    values: {
                        custbody_approved: approve
                    },
                    options: {
                        ignoreMandatoryFields: true
                    }
                });

                redirect.toRecord({
                    id: newRecord.id,
                    type: newRecord.type
                });
            }
        }

        /**
         * Clears necessary fields when record is copied.
         * @param {*} newRecord
         */
        const clearFields = (newRecord) => {
            newRecord.setValue({ fieldId: 'custbody_approved', value: false });
        }

        return {
            beforeLoad: beforeLoad,
            beforeSubmit: beforeSubmit
        };
    });
