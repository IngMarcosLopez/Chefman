/**
 * 库位表 用户事件
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 *
 */

define(["../../plugin/bsworks/bsworksUtil-1.0.min", "N/record"], (bsworks, record) => {


    const beforeSubmit = (context) => {
        if (context.type != "delete") {
            //设置本地同步状态为“未同步”，如果是通过restlet接口调用执行保存操作，则不执行
            const apiSyncStatus = context.newRecord.getValue("bsworks_api_sync_status");
            if (bsworks.isNullOrEmpty(apiSyncStatus)) {
                context.newRecord.setValue({ fieldId: "custrecord_bsw_bin_local_sync_status", value: false });
            }
        }
    }

    return {
        beforeSubmit,
    }
})