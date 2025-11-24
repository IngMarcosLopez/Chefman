/**
 * 供应商退货授权 客户端事件
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 *
 */

define(["../../plugin/bsworks/bsworksUtil-1.0.min", "../../Api/Util/mesApiUtil", "N/ui/dialog", "N/record"], (bsworks, mesApiUtil, dialog, record) => {

    /**
     * 页面初始化
     * @param {*} context 
     */
    const pageInit = (context) => {

    }

    /**
     * 推送数据到MES
     * @param {*} recordId 
     * @param {*} buttonId 
     */
    const doPushToMes = (recordId, buttonId) => {
        try {
            const recordObj = record.load({ type: "vendorreturnauthorization", id: recordId });
            const responseObj = mesApiUtil.pushVendorReturnAuthorization(recordObj);
            console.log("responseObj", responseObj)
            dialog.alert({
                title: "提示",
                message: responseObj.message
            });
            setTimeout(function () {
                window.location.reload();
            }, 1500);
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
        doPushToMes
    }

});