/**
 * 工单 客户端事件
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 *
 */

define(["../../../plugin/bsworks/bsworksUtil-1.0.min", "../../../Api/Util/mesApiUtil", "N/ui/dialog", 'N/url', "N/record", "N/format"], (bsworks, mesApiUtil, dialog, hostUrl, record, format) => {

    /**
     * 页面初始化
     * @param {*} context 
     */
    const pageInit = (context) => {

    }

    /**
     * 打开领料弹出框
     * @param {} buttonId 
     */
    const doTargetPickItemPage = (recordId, buttonId) => {
        try {
            const title = (buttonId == "custpage_workorder_outitem" ? "外协备料" : "车间备料");
            const targetScriptUrl = hostUrl.resolveScript({
                scriptId: "customscript_bsw_workorder_pickitem_sl",
                deploymentId: "customdeploy_bsw_workorder_pickitem_sl"
            });
            const targetUrl = "https://" + hostUrl.resolveDomain({ hostType: hostUrl.HostType.APPLICATION }) + targetScriptUrl + "&recordId=" + recordId + "&title=" + title;
            setTimeout(() => {
                const width = parseInt(document.documentElement.clientWidth * 0.85);
                const left = parseInt((document.documentElement.clientWidth - width - 10) / 2);
                const height = parseInt(document.documentElement.clientHeight);
                const top = parseInt((document.documentElement.clientHeight - height - 30) / 2);
                // const top = 0;
                const openParams = "left=" + left + ",top=" + top + ",width=" + width;
                window.open(targetUrl, "转移库存信息", openParams);
            }, 100);
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

    /**
     * 推送数据到MES
     * @param {*} recordId 
     * @param {*} buttonId 
     */
    const doPushToMes = (recordId, buttonId) => {
        try {
            const recordObj = record.load({ type: "workorder", id: recordId });
            //创建日期大于等于2024-08-29，并且地点为厨曼杭州的工单不能推送到MES
            let datecreated = recordObj.getValue("createddate");
            datecreated = format.format({ value: datecreated, type: "date", timezone: format.Timezone.ASIA_HONG_KONG });
            const nowdate = "2024-08-29";
            const location = recordObj.getValue("location");
            // console.log("datecreated", datecreated, nowdate, location)
            if (location == "32" && datecreated >= nowdate) {
                dialog.alert({
                    title: "提示",
                    message: "日期大于等于2024-08-29，并且地点为厨曼杭州仓库，不能推送到MES"
                });
                return;
            }
            const responseObj = mesApiUtil.pushWorkOrder(recordObj);
            dialog.alert({
                title: "提示",
                message: responseObj.message
            });

            if (responseObj.status == "fail") return;
            setTimeout(function () {
                window.location.reload();
            }, 3000);
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
        doTargetPickItemPage,
        doPushToMes
    }

});