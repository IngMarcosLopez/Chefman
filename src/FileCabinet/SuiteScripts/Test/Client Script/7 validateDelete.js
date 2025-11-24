/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
//define([],        //原始格式的参数定义
define(["N/ui/dialog", "N/record", 'N/url', "N/https"],    //增加参数定义
    function (dialog) {


        /**
         * Validation function to be executed when record is deleted.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @returns {boolean} Return true if sublist line is valid
         *
         * @since 2015.2
         */
        function validateDelete(scriptContext) {
            console.log("Validate Delete Triggered: ", scriptContext.sublistId);    //如果方法被调用，则显示控制台日志
            //删除行时，显示当前行的货品ID
            var itemId = scriptContext.currentRecord.getCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'item'
            });
            console.log("Item ID is: ", itemId);
            //当被删除行数量大于2时，删除时弹窗报错提示，数量≤2时可以删除
            var itemQty = scriptContext.currentRecord.getCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'quantity'            //注意要使用单引号
            });
            if (parseInt(itemQty) == 1) {
                return true;
            }
            else {
             //普通格式的报错提醒
             /*
               alter("货品数量大于2,不允许删除.");
               return false;
            */

             //基于Netsuite格式进行的报错提醒,需要再前置的define和function中的参数中定义明确
                dialog.alert({                  
                    title: "提示",
                    message: "货品数量大于2,不允许删除.",
                });
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
    validateDelete: validateDelete,
    //saveRecord: saveRecord
};
    
});
