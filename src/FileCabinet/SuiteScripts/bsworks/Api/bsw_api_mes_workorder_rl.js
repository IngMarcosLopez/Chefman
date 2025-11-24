/**
 * NetSuite&MES数据交换-工单 API脚本
 * 正式环境接口地址：https://7336086.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=5538&deploy=1
 * 沙盒环境接口地址：
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */

define(["../plugin/bsworks/bsworksUtil-1.0.min", "N/encode", "N/record"], (bsworks, encode, record) => {

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

        const maindata = requestBody.maindata;
        if (null == maindata || Object.keys(maindata).length == 0) {
            return bsworks.https.getFailResponse("主数据不能为空");
        }
        if (bsworks.isNullOrEmpty(maindata.internalid)) {
            return bsworks.https.getFailResponse("工单ID不能为空！");
        }
        try {
            const internalid = maindata.internalid;
            const woRecord = record.load({ type: "workorder", id: internalid });
            //是否自制
            const custbody_ca_part_product = maindata.custbody_ca_part_product == "1";
            woRecord.setValue({ fieldId: "custbody_ca_part_product", value: custbody_ca_part_product });
            if (maindata.custbody_wo_relation_sopo) {
                woRecord.setValue({ fieldId: "custbody_wo_relation_sopo", value: maindata.custbody_wo_relation_sopo });
            }
            woRecord.save({ ignoreMandatoryFields: true });

            return bsworks.https.getSuccessResponse(null, { internalid: internalid });

        } catch (e) {
            log.error("update workorder throws exception", e);
            return bsworks.https.getFailResponse(e.message);
        }
    }

    return {
        post: doPost
    }
});