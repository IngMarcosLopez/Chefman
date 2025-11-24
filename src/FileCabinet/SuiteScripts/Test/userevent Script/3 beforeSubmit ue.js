/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/log'],
    /**
 * @param{log} log
 */
    (log) => {
        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {
            //执行日志时输出脚本执行上下文
            log.debug({
                title: 'Before Submmit scriptContext With',
                details: 'The scriptContext is: ' + scriptContext
            })
            //输出旧记录的Memo值
            log.debug({
                title: 'Old value of memo',
                details: scriptContext.oldRecord.getValue({
                    fieldId: 'memo'
                })
            })
            //输出新记录的Memo值
            log.debug({
                title: 'New value of memo',
                details: scriptContext.newRecord.getValue({
                    fieldId: 'memo'
                })
            })
            throw "请输入有效值";
        //throw是一个用于触发异赏的操作符。当程序执行到throw语复时，会立即终止当前代码块的执行，并将控制权交给调用栈中上一级的异常处理器。
        }

        return { beforeSubmit }

    });
