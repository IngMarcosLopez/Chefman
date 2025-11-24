/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([],

    () => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            var request = scriptContext.request;        //定义变量可用于后续简化书写，代码可读性强
            var response = scriptContext.response;

            //其他请求方法(DELETE/GET/HEAD/PUT/POST),通过搜索ServerRequest.method中的https.Method
            if (request.method == 'POST') {
                var comments = request.body;

                log.debug({
                    title: 'comments',
                    details: comments
                });

                if (comments == NULL || comments == '') {
                    log.debug({
                        title: 'response value',
                        details: 'F'
                    });
                    response.write({
                        output: 'F'
                    });
                }
                else{
                    log.debug({
                        title: 'response value',
                        details: 'T'
                    });
                    response.write({
                        output: 'T'
                    });
                }
            }
        }

        return { onRequest }

    });
