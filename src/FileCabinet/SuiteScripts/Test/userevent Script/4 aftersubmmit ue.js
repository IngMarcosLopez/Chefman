/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/redirect'],
    /**
 * @param{record} record
 * @param{redirect} redirect
 */
    (record, redirect) => {
        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {
            //执行日志时输出脚本执行上下文
            log.debug({
                title: 'After Submmit scriptContext With',
                details: 'The scriptContext is: ' + scriptContext
            });
            //通过变量var获取memo的字段内容
            var oldMemo = scriptContext.oldRecord.getValue({
                fieldId: 'memo'
            })
            var newMemo = scriptContext.newRecord.getValue({
                fieldId: 'memo'
            })
            //执行日志上下文重新查看执行的数据结果
            log.debug({
                title: 'New value of memo',
                details: newMemo
            })
            log.debug({
                title: 'Old value of memo',
                details: oldMemo
            })
            
            //对重新定向的记录赋值跳转值
            var newCustomer = scriptContext.newRecord.getValue({
                fieldId:'entity'
            })
            //重定向跳转到单据上的客户档案
            //redirect to customer record.
            redirect.toRecord({
                type : record.Type.CUSTOMER,
                id : newCustomer,
            //    parameters: {'custparam_test':'helloWorld'}
            });        
        }

        return { afterSubmit }

    });
