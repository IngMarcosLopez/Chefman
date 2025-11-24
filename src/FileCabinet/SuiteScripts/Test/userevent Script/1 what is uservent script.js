/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */

//当用户在创建、打开、更新或保存记录时处理 NetSuite 中的记录和数据更改时，会触发用户事件脚本。
//这些脚本可自定义 NetSuite 输入表单之间的工作流程和关联。这些脚本也可用于在输入记录之前执行额外的处理，或者用于基于系统中的其他数据验证条目。
//用户事件脚本在服务器上执行。


define(['N/log'],
    /**
 * @param{log} log
 */
    (log) => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => { 
            log.debug({
                title: 'before Load Debug Entry',
                details: 'before Load Script Trigger is: ' + scriptContext.type     //类型为创建/编辑/提交/查看
                });
            //设置客户记录的memo默认值为before Load
            scriptContext.newRecord.setValue({
                fieldId:'comments',
                value:'before Load'
            });
        }

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {
            log.debug({
                title: 'before Submit Debug Entry',
                details: 'before Submit Script Trigger is: ' + scriptContext.type
                });
            //设置客户记录的memo默认值为before Submit
            scriptContext.newRecord.setValue({
                fieldId:'comments',
                value:'before Submit'
            });
        }

        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {
            log.debug({
                title: 'after Submit Debug Entry',
                details: 'after Submit Script Trigger is: ' + scriptContext.type
                });
            //设置客户记录的memo默认值为after Submit
            scriptContext.newRecord.setValue({
                fieldId:'comments',
                value:'after Submit'
            });
        }

        return {beforeLoad, beforeSubmit, afterSubmit}
        //beforeLoad:记录加载前
        //beforeSubmit：记录提交前
        //afterSubmit：记录提交后，存至服务器
        //scriptContext.type:事件类型为 //Quickview/创建/删除/包装/发运/取消/编辑/直接列表编辑/直接发运/编辑预测/订购货品
                                       //转换/重新分配/复制/打印/批准/拒绝/提交/撤销/支付/查看
                                       //更改密码/查看/标记完成/特殊订单/电子邮件

    });