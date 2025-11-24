/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/http', 'N/https', 'N/url', 'N/ui/dialog'],
    /**
     * @param{http} http
     * @param{https} https
     * @param{url} url
     */
    function (http, https, url, dialog) {

        /**
         * Validation function to be executed when record is saved.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @returns {boolean} Return true if record is valid
         *
         * @since 2015.2
         */
        function saveRecord(scriptContext) {
            try {
                var currentObj = scriptContext.currentRecord;
                //获取客户记录的备注信息
                var comments = currentObj.getValue({
                    fieldId: 'comments'
                });
                //调用Suitelet并传送参数comments,通过使用N/url中的url.resolveScrip方法
                var suiteUrl = url.resolveScript({
                    scriptId: 'customscript_sl_back_result',    //脚本ID
                    deploymentId: 'customdeploy_sl_back_result',    //脚本部署ID
                });
                //通过使用N/https中的https.post方法,用于发送 HTTPS POST 请求并返回响应的方法。
                var response = https.post({
                    url: suiteUrl,
                    body: comments
                });
                log.debug({
                    title: 'response',
                    details: JSON.stringify(response)
                })

                if (response.body == 'F') {
                    dialog.alert({
                        title: 'warning',
                        message: 'Comments are empty,please fill in the comments'
                    });
                    return false;
                }

                return true;
            }
            catch (e) {
                log.error({
                    title: 'Error in Client Script saveRec',
                    details: e.toString()
                })
            }
        }
        return {
            saveRecord: saveRecord
        };

    });
