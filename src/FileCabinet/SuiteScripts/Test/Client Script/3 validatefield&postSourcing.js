/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define([],

    function () {

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
        function validateField(scriptContext) {
            /* 
            if (scriptContext.fieldId == 'memo') {                     //验证字段函数
                 console.log("validateField Function Triggered.");
            }
            return true;                                               //当为 return false时，备注字段修改时将会变为焦点闪动，无法跳出该字段
            */

            var currentRecordObj = scriptContext.currentRecord;
            if (currentRecordObj.getValue('memo') == 'ui')            //只有备注为ui时，才能成功验证
                return true;
            else
            //    alter('备注请输入ui,否则无法跳出')
            return false;
        }


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
            console.log('postSourcing method triggered', scriptContext.fieldId);  //console控制台显示哪些字段执行了触发
            if (scriptContext.sublistId == 'item' && scriptContext.fieldId == 'item') {
                scriptContext.currentRecord.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'isclosed',                    //选择行货品后，默认勾选SO货品行中的'已关闭'按钮
                    value: true
                })
                console.log('已关闭复选框已经被勾选');
            }
        }
            return {
                //pageInit: pageInit,
                //fieldChanged: fieldChanged,
                postSourcing: postSourcing,
                //sublistChanged: sublistChanged,
                //lineInit: lineInit,
                validateField: validateField,
                //validateLine: validateLine,
                //validateInsert: validateInsert,
                //validateDelete: validateDelete,
                //saveRecord: saveRecord
            };

        });
