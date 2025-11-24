/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/currentRecord', 'N/url'],

    /**
     * @param {currentRecord} currentRecord
     * @param {url} url
     */
    function (currentRecord, url,) {

        /**
         * Function to be executed after page is initialized.
         *
         * @param {Object} context
         * @param {Record} context.currentRecord - Current form record
         * @param {string} context.mode - The mode in which the record is being accessed (create, copy, or edit)
         *
         * @since 2015.2
         */
        function pageInit(context) {

        }

        /**
         * Function to be executed when field is changed.
         *
         * @param {Object} context
         * @param {Record} context.currentRecord - Current form record
         * @param {string} context.sublistId - Sublist name
         * @param {string} context.fieldId - Field name
         * @param {number} context.lineNum - Line number. Will be undefined if not a sublist or matrix field
         * @param {number} context.columnNum - Line number. Will be undefined if not a matrix field
         *
         * @since 2015.2
         */
        const fieldChanged = context => {
            const record = context.currentRecord;

            if (context.fieldId === 'custpage_customer') {
                executeSearch();
            }

        }

        /**
         * Function to be executed when field is slaved.
         *
         * @param {Object} context
         * @param {Record} context.currentRecord - Current form record
         * @param {string} context.sublistId - Sublist name
         * @param {string} context.fieldId - Field name
         *
         * @since 2015.2
         */
        function postSourcing(context) {

        }

        /**
         * Function to be executed after sublist is inserted, removed, or edited.
         *
         * @param {Object} context
         * @param {Record} context.currentRecord - Current form record
         * @param {string} context.sublistId - Sublist name
         *
         * @since 2015.2
         */
        function sublistChanged(context) {

        }

        /**
         * Function to be executed after line is selected.
         *
         * @param {Object} context
         * @param {Record} context.currentRecord - Current form record
         * @param {string} context.sublistId - Sublist name
         *
         * @since 2015.2
         */
        function lineInit(context) {

        }

        /**
         * Validation function to be executed when field is changed.
         *
         * @param {Object} context
         * @param {Record} context.currentRecord - Current form record
         * @param {string} context.sublistId - Sublist name
         * @param {string} context.fieldId - Field name
         * @param {number} context.lineNum - Line number. Will be undefined if not a sublist or matrix field
         * @param {number} context.columnNum - Line number. Will be undefined if not a matrix field
         *
         * @returns {boolean} Return true if field is valid
         *
         * @since 2015.2
         */
        function validateField(context) {
            return true;
        }

        /**
         * Validation function to be executed when sublist line is committed.
         *
         * @param {Object} context
         * @param {Record} context.currentRecord - Current form record
         * @param {string} context.sublistId - Sublist name
         *
         * @returns {boolean} Return true if sublist line is valid
         *
         * @since 2015.2
         */
        function validateLine(context) {
            return true;
        }

        /**
         * Validation function to be executed when sublist line is inserted.
         *
         * @param {Object} context
         * @param {Record} context.currentRecord - Current form record
         * @param {string} context.sublistId - Sublist name
         *
         * @returns {boolean} Return true if sublist line is valid
         *
         * @since 2015.2
         */
        function validateInsert(context) {
            return true;
        }

        /**
         * Validation function to be executed when record is deleted.
         *
         * @param {Object} context
         * @param {Record} context.currentRecord - Current form record
         * @param {string} context.sublistId - Sublist name
         *
         * @returns {boolean} Return true if sublist line is valid
         *
         * @since 2015.2
         */
        function validateDelete(context) {
            return true;
        }

        /**
         * Validation function to be executed when record is saved.
         *
         * @param {Object} context
         * @param {Record} context.currentRecord - Current form record
         * @returns {boolean} Return true if record is valid
         *
         * @since 2015.2
         */
        function saveRecord(context) {

            const save = compareTotals();

            return save;
        }

        /**
         * This search only redirects if both values are populated. 
         */
        const executeSearch = () => {

            const record = currentRecord.get();
            const customerId = record.getValue({
                fieldId: 'custpage_customer'
            });

            if (customerId) {
                const suiteletUrl = url.resolveScript({
                    scriptId: 'customscript_scs_accrual_reversal_sl',
                    deploymentId: 'customdeploy_scs_accrual_reversal_sl',
                    params: {
                        custpage_customer: customerId
                    }
                });

                window.ischanged = false;
                window.location = suiteletUrl;
            }
        }

        const compareTotals = () => {
            const record = currentRecord.get();
            let isAmount = false;

            for (let i = 0; i < record.getLineCount({ sublistId: 'custpage_ar_accounts' }); i++) {

                record.selectLine({
                    sublistId: 'custpage_ar_accounts',
                    line: i
                });

                const transferAmount = record.getSublistValue({
                    sublistId: 'custpage_ar_accounts',
                    fieldId: 'custpage_transfer_amount',
                    line: i
                });

                if (!transferAmount) continue;

                isAmount = true;

                const accruedAmount = record.getSublistValue({
                    sublistId: 'custpage_ar_accounts',
                    fieldId: 'custpage_accrual_total',
                    line: i
                });

                console.log(transferAmount, accruedAmount, (transferAmount > accruedAmount), isAmount);

                if (transferAmount > accruedAmount) {
                    alert(`The Transfer Amount cannot be greater than the Accrual Total. Please adjust accordingly.`);
                    return false;
                }

                if (transferAmount < 0) {
                    alert(`The Transfer Amount cannot be a negative number. Please adjust accordingly.`);
                    return false;
                }
            }

            if (!isAmount) {
                alert(`No lines can be processed. Please enter at least one non-zero Transfer Amount.`);
                return false;
            }

            return true;
        }

        const setSelectField = (context) => {
            const record = context.currentRecord;

            let select = false;

            const transferAmount = record.getCurrentSublistValue({
                sublistId: 'custpage_ar_accounts',
                fieldId: 'custpage_transfer_amount'
            });

            if (transferAmount) {
                select = true;
            }

            record.setCurrentSublistValue({
                sublistId: 'custpage_ar_accounts',
                fieldId: 'custpage_select',
                value: select
            });
        }

        return {
            executeSearch: executeSearch,
            pageInit: pageInit,
            fieldChanged: fieldChanged,
            postSourcing: postSourcing,
            sublistChanged: sublistChanged,
            lineInit: lineInit,
            validateField: validateField,
            validateLine: validateLine,
            validateInsert: validateInsert,
            validateDelete: validateDelete,
            saveRecord: saveRecord
        };
    });
