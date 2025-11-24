/**
 * @author Kyle Lopes <kyle.lopes@scscloud.com>
 * @version 2022-12-05
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @NScriptType UserEventScript
 **/

define(['N/record', 'N/query', '../Library/scs-library-2'],

    /**
     * 
     * @param {*} record 
     * @param {*} query 
     * @param {*} scsLibrary 
     * @returns {{afterSubmit: afterSubmit}}
     */
    (record, query, scsLibrary) => {

        var OBJ_INVOICE_UE = {};
        OBJ_INVOICE_UE.TAX_ITEMS = {};
        OBJ_INVOICE_UE.TAX_ITEMS.CANADA = {
            72289: {
                type: "HST",
                percent: "15%"
            },
            72290: {
                type: "GST",
                percent: "5%"
            },
            72292: {
                type: "HST",
                percent: "13%"
            },
            76216: {
                type: "VAT",
                percent: "13%"
            },
            69363: {
                type: "VAT",
                percent: "21%"
            }
        };

        const beforeSubmit = context => {
            try {
                if (context.type == context.UserEventType.CREATE || context.type == context.UserEventType.EDIT) {
                    setInvoicePDFFields(context);
                    setSPSTaxFields(context);
                }
                
            }
            catch (error) {
                log.error('beforeSubmit', error.toJSON ? error : error.toString());
            }
        }

        const afterSubmit = context => {
            try {

                if (context.type == context.UserEventType.CREATE) {
                    createJournalEntries(context.newRecord);
                }

            } catch (error) {
                log.error('afterSubmit', error.toJSON ? error : error.toString());
            }
        }

        /**
         * Sets the SPS tax fields required for the CSV export for 810s.
         * For each line, check if the item ID is any of the OBJ_INVOICE_UE.TAX_ITEMS.CANADA attributes.
         * If so, we can only capture up to two. The first two will be selected.
         * 
         * TODO Add logs, test and deploy
         * 
         * @param {*} context 
         */
        const setSPSTaxFields = (context) => {
            var stLogTitle = "setSPSTaxFields";
            log.audit(stLogTitle, "Start");

            try {
                const MAX_TAX_TYPES = 2;
                var taxTypeCount = 0;
                var taxRate1 = 0;
                var taxAmount1 = 0;
                var taxRate2 = 0;
                var taxAmount2 = 0;
    
                var newRecord = context.newRecord;
                var lineCount = newRecord.getLineCount({
                    sublistId: "item"
                });
    
                for (var lineIndex = 0; lineIndex < lineCount; lineIndex++) {
    
                    // Only support 2 tax types for SPS
                    if (taxTypeCount == MAX_TAX_TYPES) {
                        break;
                    }
    
                    var itemId = newRecord.getSublistValue({
                        sublistId: "item",
                        fieldId: "item",
                        line: lineIndex
                    });
    
                    if (OBJ_INVOICE_UE.TAX_ITEMS.CANADA.hasOwnProperty(itemId)) {
    
                        var taxAmount = parseFloat(newRecord.getSublistValue({
                            sublistId: "item",
                            fieldId: "amount",
                            line: lineIndex
                        })) || 0;
    
                        var taxRate = (parseFloat(newRecord.getSublistValue({
                            sublistId: "item",
                            fieldId: "rate",
                            line: lineIndex
                        })) || 0) / 100;   
    
                        if (taxTypeCount == 0) {
                            newRecord.setValue({
                                fieldId: "custbody_sps_tax_type_1",
                                value: OBJ_INVOICE_UE.TAX_ITEMS.CANADA[itemId].type
                            });
                            newRecord.setValue({
                                fieldId: "custbody_sps_tax_percent",
                                value: taxRate * 100
                            });
                            newRecord.setValue({
                                fieldId: "custbody_sps_tax_amount",
                                value: taxAmount
                            });

                        }
                        else if (taxTypeCount == 1) {
                            newRecord.setValue({
                                fieldId: "custbody_sps_tax_type_2",
                                value: OBJ_INVOICE_UE.TAX_ITEMS.CANADA[itemId].type
                            });
                            newRecord.setValue({
                                fieldId: "custbody_sps_tax_percent_2",
                                value: taxRate * 100
                            });
                            newRecord.setValue({
                                fieldId: "custbody_sps_tax_amount_type_2",
                                value: taxAmount
                            });
                        }
    
                        taxTypeCount++;
                    }
                }

                log.audit(stLogTitle, "End");
            }
            catch (error) {
                log.error("An error occurred " + stLogTitle, error);
            }
        }

        /**
         * Sets fields needed to show on the Invoice PDF.
         * 
         * @param {*} context 
         */
        const setInvoicePDFFields = (context) => {

            var termsData = getTermsData(context);

            if (!termsData) return;

            // Set Net Days
            setNetDays(context, termsData);

            // Set Discount Due Date
            setDiscountDueDate(context, termsData);

            // Set Discount Days Due
            setDiscountDaysDue(context, termsData);

            // Set Discount Amount Due
            setDiscountAmountDue(context, termsData);

            // Set Number of distinct products sold (inventory lines)
            setNumberLineItems(context);


        }

        /**
         * Sets the Net Days field on the Invoice.
         * custbody_scs_terms_net_days
         * 
         * @param {*} context
         * @param {*} termsData 
         */
        const setNetDays = (context, termsData) => {
            try {
                var netDays = termsData.daysuntilnetdue;
                log.debug('netDays', netDays);
    
                context.newRecord.setValue({ fieldId: 'custbody_scs_terms_net_days', value: netDays });
            }
            catch (error){
                log.error('setNetDays', error);
            }
            

        }

        /**
         * Set the Discount Due Date field on the Invoice
         * custbody_scs_terms_discount_due_date
         * 
         * @param {*} termsData 
         */
        const setDiscountDueDate = (context, termsData) => {
            try {
                var daysUntilExpiry = termsData.daysuntilexpiry;
                log.debug('daysUntilExpiry', daysUntilExpiry);
    
                var tranDate = context.newRecord.getValue({ fieldId: 'trandate' });
                tranDate = new Date(tranDate);
    
                var discountDueDate = new Date(tranDate.setDate(tranDate.getDate() + daysUntilExpiry));

                log.debug('discountDueDate', discountDueDate);
    
                context.newRecord.setValue({ fieldId: 'custbody_scs_terms_discount_due_date', value: discountDueDate });
            }
            catch (error){
                log.error('setDiscountDueDate', error);
            }
            

        }

        /**
         * Set the Discount Days Due field on the Invoice
         * custbody_scs_terms_discount_days_due
         * 
         * @param {*} context 
         * @param {*} termsData 
         */
        const setDiscountDaysDue = (context, termsData) => {
            try {
                var daysUntilExpiry = termsData.daysuntilexpiry;
                log.debug('daysUntilExpiry', daysUntilExpiry);
    
                context.newRecord.setValue({ fieldId: 'custbody_scs_terms_discount_days_due', value: daysUntilExpiry });
            }
            catch (error) {
                log.error('setDiscountDaysDue', error);
            }
            
        }

        /**
         * Set the Discount Amoune Due field on the Invoice
         * custbody_scs_terms_discount_amount_due
         * 
         * @param {*} context 
         * @param {*} termsData 
         */
        const setDiscountAmountDue = (context, termsData) => {
            try {
                var totalAmount = context.newRecord.getValue({ fieldId: 'total' });
                var discountPercent = termsData.discountpercent / 100;

                var discountedTotalAmount = totalAmount * (1 - discountPercent);

                log.debug('discountedTotalAmount', discountedTotalAmount);

                context.newRecord.setValue({ fieldId: 'custbody_scs_terms_discount_amount_due', value: discountedTotalAmount });
            }
            catch (error) {
                log.error('setDiscountAmountDue', error);
            }
        }

        /**
         * Calculates the number of distinct line items on the Invoice.
         * This field is used for PDF printing.
         * custbody_scs_number_line_items
         * 
         * @param {*} context 
         */
        const setNumberLineItems = (context) => {
            // For each line item, check if it is an inventory item. If it is, increment the count.
            var inventoryLineCount = 0;

            var lineCount = context.newRecord.getLineCount({ sublistId: 'item' });

            for (var i = 0; i < lineCount; i++) {
                var itemType = context.newRecord.getSublistValue({ sublistId: 'item', fieldId: 'itemtype', line: i });

                if (itemType == 'InvtPart') {
                    inventoryLineCount++;
                }
            }
            context.newRecord.setValue({ fieldId: 'custbody_scs_number_line_items', value: inventoryLineCount });
        } 

        

        const getTermsData = (context) => {

            var termsId = context.newRecord.getValue({ fieldId: 'terms' });

            var queryString = `
            SELECT  
                t.name,
                t.discountPercent,
                t.dayDiscountExpires,
                t.daysUntilExpiry,
                t.daysUntilNetDue

            FROM term t

            WHERE t.id = ${termsId}
            `;

            log.debug("Querying for termsId", queryString);

            const results = query.runSuiteQL(queryString).asMappedResults();

            log.debug('termsData', JSON.stringify(results));

            if (results.length > 0) {
                return results[0];
            }
            else {
                return null;
            }
        }

        const createJournalEntries = (newRecord) => {
            const entity = newRecord.getValue({ fieldId: 'entity' });
            const accruals = getAccrualRecord(entity);

            if (!accruals || accruals.length == 0) return;

            log.debug('accruals', accruals);

            for (let i in accruals) {
                createJournalEntry(newRecord, accruals[i]);
            }
        }

        /**
         * For certain customers an amount must be accrued. This script ensures that this happens. By creating a Journal Entry.
         * @param {*} newRecord 
         * @returns {null}
         */
        const createJournalEntry = (newRecord, accrual) => {
            const MarketingAllowancesReservesAcc = 751;

            const total = scsLibrary.parseFloat(newRecord.getValue({ fieldId: 'total' }));

            // Don't process the Journal Entry if there is no valid percentage;
            if (!accrual.percent) return;

            const subsidiary = newRecord.getValue({ fieldId: 'subsidiary' });
            const tranId = newRecord.getValue({ fieldId: 'tranid' });

            const accrualAmount = total * accrual.percent;

            const journalEntry = record.create({
                type: record.Type.JOURNAL_ENTRY,
                isDynamic: true
            });

            journalEntry.setValue({ fieldId: 'subsidiary', value: subsidiary });
            journalEntry.setValue({ fieldId: 'memo', value: `${tranId} - Accrual` });
            journalEntry.setValue({ fieldId: 'custbody_created_from_transaction', value: newRecord.id });

            journalEntry.selectNewLine({ sublistId: 'line' });
            journalEntry.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: accrual.account });
            journalEntry.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: accrualAmount });
            journalEntry.setCurrentSublistValue({ sublistId: 'line', fieldId: 'entity', value: accrual.entity });

            journalEntry.commitLine({ sublistId: 'line' });

            journalEntry.selectNewLine({ sublistId: 'line' });
            journalEntry.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: accrual.araccount });
            journalEntry.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: accrualAmount });
            journalEntry.setCurrentSublistValue({ sublistId: 'line', fieldId: 'entity', value: accrual.entity });

            journalEntry.commitLine({ sublistId: 'line' });

            const journalEntryId = journalEntry.save({ ignoreMandatoryFields: true });

            log.audit('Journal Entry Successfully Created', {
                invoiceId: newRecord.id,
                invoiceTotal: total,
                journalEntry: journalEntryId,
                accrual: accrual,
                accrualAmount: accrualAmount,
            });

            return journalEntryId;
        }

        /**
         * 
         * 
         * @param {int} entity 
         * @returns {array}
         */
        const getAccrualRecord = (entity) => {
            const results = query.runSuiteQL(`
                SELECT  ia.custrecord_ia_account account,
                        ia.custrecord_ia_ar_account araccount,
                        ia.custrecord_ia_percentage percent,
                        ia.custrecord_ia_customer entity

                FROM customrecord_invoice_accrual ia

                WHERE ia.custrecord_ia_customer = ${entity}

            `).asMappedResults();

            return results;
        }

        return {
            beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        };
    });