/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/currentRecord'],                             //声明函数'N/currentRecord'，用于生效function相关函数

    function () {

        /**
         * Function to be executed after page is initialized.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record    //当前表单记录
         * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)  //访问记录的模式（创建、复制或编辑）
         *
         * @since 2015.2
         */

        //    function pageInit(scriptContext) {
        //        console.log("pageInit method triggered");   //F12下的控制台console监控方法,用于查看哪些函数生效
        //        alert("首个pageINIT CS客户端加载前脚本验证");
        //    }
        function pageInit(scriptContext) {
            console.log("Page Init method triggered");
            var currentRecordobj = scriptContext.currentRecord;        //生效给当前表单记录
            currentRecordobj.setValue({
                fieldId: 'entity',                                     //记录加载前对实体字段赋值
                value: 1569,
            })
            currentRecordobj.setValue({
                fieldId: 'approvalstatus',                             //默认审批状态为通过
                value: 2,
            })
        }

        /**
         * Function to be executed when field is changed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
         * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
         *
         * @since 2015.2
         */
        function fieldChanged(scriptContext) {
            if (scriptContext.fieldId == 'subsidiary') {
           //     alter("子公司已修改");
                console.log("子公司已变更");
        };
            if (scriptContext.sublistId == 'item' && scriptContext.fieldId == 'item'){
                console.log('货品已修改');
        }
    }

        return {
    pageInit: pageInit,
    fieldChanged: fieldChanged,
    /**
    postSourcing: postSourcing,
    sublistChanged: sublistChanged,
    lineInit: lineInit,
    validateField: validateField,
    validateLine: validateLine,
    validateInsert: validateInsert,
    validateDelete: validateDelete,
    saveRecord: saveRecord
    */
};
    });
