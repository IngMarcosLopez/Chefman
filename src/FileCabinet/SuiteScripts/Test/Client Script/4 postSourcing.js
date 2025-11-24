/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define([],

    function () {

        /**
         * Function to be executed when field is slaved.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         *
         * @since 2015.2
         */
        function postSourcing(scriptContext) {
            console.log('postSourcing method triggered', scriptContext.fieldId);       //console控制台显示哪些字段执行了触发
            if (scriptContext.sublistId == 'item' && scriptContext.fieldId == 'item') {
        /*        scriptContext.currentRecord.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'isclosed',                    //选择行货品后，默认勾选SO货品行中的'已关闭'按钮
                    value: true
                })
        */
                scriptContext.currentRecord.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'costestimatetype',
                    value: 'LASTPURCHPRICE'                 //选择货品后，成本估计类型为上次采购价格
                })
                console.log('成本估计类型已默认');
            }
        }
            return {
                //pageInit: pageInit,
                //fieldChanged: fieldChanged,
                postSourcing: postSourcing,
                //sublistChanged: sublistChanged,
                //lineInit: lineInit,
                //validateField: validateField,
                //validateLine: validateLine,
                //validateInsert: validateInsert,
                //validateDelete: validateDelete,
                //saveRecord: saveRecord
            };

        });
