/**
 * NetSuite&MES数据交换-库存调整单 API脚本
 * 正式环境接口地址：https://7336086.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=4758&deploy=1
 * 沙盒环境接口地址：https://7336086-sb1.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=2705&deploy=1
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */

define([
    "../plugin/bsworks/bsworksUtil-1.0.min",
    "./Mes/bsw_mes_putdata_inventory",
    "N/encode"
], (bsworks, inventorydata, encode) => {

    const doPost = (requestBody) => {
        if (null == requestBody || "" == requestBody) {
            return bsworks.https.getFailResponse("请求参数不能为空！");
        }

        if (!(requestBody instanceof Object)) {
            requestBody = JSON.parse(encode.convert({
                string: requestBody,
                inputEncoding: encode.Encoding.BASE_64,
                outputEncoding: encode.Encoding.UTF_8
            }));
            log.debug("requestBody-base", requestBody);
        } else {
            log.debug("requestBody", requestBody);
        }


        const recordType = requestBody.recordType;
        if (bsworks.isNullOrEmpty(recordType)) {
            return bsworks.https.getFailResponse("请求参数recordType不能为空！");
        }

        if (recordType == "put_inventoryadjustment") {
            //推送库存调整单数据
            return inventorydata.putInventoryadjustment(requestBody);
        } else {
            return bsworks.https.getFailResponse("请求参数recordType不是" + recordType + "！");
        }
    }

    return {
        post: doPost
    }
});