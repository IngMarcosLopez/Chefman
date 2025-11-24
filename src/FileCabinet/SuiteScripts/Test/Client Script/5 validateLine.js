/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define([],

    function () {

        /*    function lineInit(scriptContext) {                     //货品行的数量字段赋值数量=2
                console.log("Line Init Triggered.");
                var currentRecordObj = scriptContext.currentRecord;
                var sublistName = scriptContext.sublistId;
                if (sublistName == 'item') {
                currentRecordObj.setCurrentSublistValue({
                    sublistId: sublistName,
                    fieldId: 'quantity',                //注意要使用单引号
                    value: 2
                })
            }
        }
        */

        /**
         * Validation function to be executed when field is changed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
         * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
         *
         * @returns {boolean} Return true if field is valid
         *
         * @since 2015.2
         */

        function validateLine(scriptContext) {
            console.log("validate Line function triggered.", scriptContext.sublistId);
            var fieldValue = scriptContext.currentRecord.getCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'item'
             })
            if (parseInt(fieldValue) == 2718) {
        //表示当货品为ID=2718时，才能够生效赋值货品的行数据添加，其他货品添加时为无效，无法添加
                console.log("Item Value: ", fieldValue);
                return true;
            } else {
                console.log("Use valid item");
                return false;
            }
        }
            /**
             * Validation function to be executed when sublist line is inserted.
             *
             * @param {Object} scriptContext
             * @param {Record} scriptContext.currentRecord - Current form record
             * @param {string} scriptContext.sublistId - Sublist name
             *
             * @returns {boolean} Return true if sublist line is valid
             *
             * @since 2015.2
             */


            return {
                // pageInit: pageInit,
                // fieldChanged: fieldChanged,
                // postSourcing: postSourcing,
                // sublistChanged: sublistChanged,
                //lineInit: lineInit,
                // validateField: validateField,
                validateLine: validateLine,
                // validateInsert: validateInsert,
                // validateDelete: validateDelete,
                // saveRecord: saveRecord
            };

        });             //轻轻放下
