/**
 * 销售退货授权 用户事件
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 *
 */

define(["../../plugin/bsworks/bsworksUtil-1.0.min"], (bsworks) => {

    const beforeLoad = (context) => {
        if (context.type == "view") {
            var recordObj = context.newRecord;

            //子公司是杭州厨曼，并且MES推送状态未勾选，显示推送按钮
            if (recordObj.getValue("subsidiary") == 25 && !recordObj.getValue("custbody_chefman_mes_pushstatus")) {
                context.form.clientScriptModulePath = './bsw_rtnauth_cs.js';
                let buttonId = "custpage_push_to_mes";
                context.form.addButton({
                    id: buttonId,
                    label: "推送到MES",
                    functionName: "doPushToMes('" + recordObj.id + "','" + buttonId + "')"
                });
                const buttonIds = [buttonId];
                bsworks.userEvent.beforeLoad.addButtonEventListener(context.form, buttonIds, true);
            }
        }
    }

    const beforeSubmit = (context) => {
        if (context.type != "delete") {
            //设置本地同步状态为“未同步”，如果是通过restlet接口调用执行保存操作，则不执行
            const apiSyncStatus = context.newRecord.getValue("bsworks_api_sync_status");
            if (bsworks.isNullOrEmpty(apiSyncStatus)) {
                context.newRecord.setValue({ fieldId: "custbody_chefman_mes_pushstatus", value: false });
            }
        }
    }

    const afterSubmit = (context) => {

    }

    return {
        beforeLoad,
        beforeSubmit,
        afterSubmit
    }

});