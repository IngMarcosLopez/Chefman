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
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */

        //帮助中心搜索beforeload，或通过链接查询https://9451612-sb1.app.netsuite.com/app/help/helpcenter.nl?fid=section_4407991781.html
        //触发事件类型：create、edit、view、copy、print、email、quick view
        const beforeLoad = (scriptContext) => {
            //记录Beford Load被触发的场景
            log.debug({
                title: 'Beford Load Trigged',
                details: 'Triggerd scriptContext is: ' + scriptContext
            });

            //当前表单在编辑时添加“创建工单”按钮
            var form = scriptContext.form;
            if (scriptContext.type == scriptContext.UserEventType.EDIT) {       //criptContext.UserEventType.EDIT参照(https://9451612-sb1.app.netsuite.com/app/help/helpcenter.nl?fid=section_1510274245.html)
                form.addButton({
                    id: 'custpage_created_wo',
                    label: '创建工单',
                    //    functionName:'customFunctionName'
                })
            }
        }
        return { beforeLoad }

    });
