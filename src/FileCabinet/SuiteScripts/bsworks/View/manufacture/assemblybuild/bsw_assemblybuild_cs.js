/**
 * 装配件构建 客户端事件
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 *
 */

define(["../../../plugin/bsworks/bsworksUtil-1.0.min", "N/ui/dialog"], (bsworks, dialog) => {

    /**
     * 页面初始化
     * @param {*} context 
     */
    const pageInit = (context) => {

    }

    /**
      * 创建库存转移单
      * @param {*} recordId 
      * @param {*} buttonId 
      */
    const doCreateInventoryTransfer = (recordId, buttonId) => {
        try {
            const requestData = { recordId: recordId, buttonId: buttonId };
            const responseObject = bsworks.https.post("bsw_assemblybuild_sl", "doCreateInventoryTransfer", requestData);
            if (responseObject.status == "fail") {
                console.log("error", responseObject.message);
                dialog.alert({
                    title: "错误提示",
                    message: responseObject.message
                });
            } else {
                const responseData = responseObject.data;
                const targetUrl = bsworks.https.getResolveDomainUrl() + "/app/accounting/transactions/invtrnfr.nl?id=" + responseData.internalid;
                window.open(targetUrl, "_blank");

                document.getElementById(bsworks.constant.client.LAODING_MASK_ID).style.display = "block";
                setTimeout(function () {
                    location.reload();
                }, 1000);
            }


        } catch (e) {
            console.log(e);
            dialog.alert({
                title: "错误提示",
                message: e.message
            });
        } finally {
            bsworks.client.mask.clearLoadingMask(buttonId);
        }
    }



    return {
        pageInit,
        doCreateInventoryTransfer
    }

});