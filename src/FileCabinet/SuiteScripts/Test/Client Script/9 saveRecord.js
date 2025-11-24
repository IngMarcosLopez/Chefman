/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define([],

    function () {

        /**
         * Validation function to be executed when record is saved.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @returns {boolean} Return true if record is valid             //提交时会进行返回值的验证
         *
         * @since 2015.2
         */
        function saveRecord(scriptContext) {
            console.log("Save Record Triggered");    //如果方法被调用，则显示控制台日志

            //在订单保存时，输出订单行数
            var currentRecord = scriptContext.currentRecord;
            var lineCount = currentRecord.getLineCount({
                sublistId: 'item'      //sublistId中list中L不能大写，否者调用不到
            });
            console.log("line Count is", lineCount);
            //如果行数小于2，则不允许保存
            if (lineCount < 2) {
                alert("行数小于2，不允许保存");
                return false;
            }
            else {
                return true;
            }
        }

        return {
            //pageInit: pageInit,
            //fieldChanged: fieldChanged,
            //postSourcing: postSourcing,
            //sublistChanged: sublistChanged,
            //lineInit: lineInit,
            //validateField: validateField,
            //validateLine: validateLine,
            //validateInsert: validateInsert,
            //validateDelete: validateDelete,
            saveRecord: saveRecord

        };

    });
