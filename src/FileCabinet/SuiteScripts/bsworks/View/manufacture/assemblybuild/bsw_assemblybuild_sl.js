/**
 * 装配件构建-库存转移 SL事件
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 *
 */

define(["../../../plugin/bsworks/bsworksUtil-1.0.min", "./bsw_assemblybuild_util"], (bsworks, assemblyUtil) => {

    const renderPage = (context) => {

    }




    const onRequest = (context) => {
        //参数值
        var requestBody = context.request.body;
        if (!bsworks.isNullOrEmpty(requestBody)) {
            let responseObject = bsworks.https.getSuccessResponse();
            try {
                requestBody = JSON.parse(requestBody);
                if (requestBody.type == "doCreateInventoryTransfer") {
                    responseObject = assemblyUtil.doCreateInventoryTransfer(requestBody.data);
                }
            } catch (e) {
                log.error("onRequest", e);
                responseObject.status = "fail";
                responseObject.message = e.message;
            }
            context.response.write(JSON.stringify(responseObject));
        } else {
            renderPage(context);
        }
    }


    return {
        onRequest
    }

});