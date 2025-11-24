/**
 * 采购订单 用户事件
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 *
 */

define(["../../plugin/bsworks/bsworksUtil-1.0.min", "../../Api/Util/mesApiUtil", "N/record"], (bsworks, mesApiUtil, record) => {

    const beforeLoad = (context) => {
        if (context.type == "view") {
            var recordObj = context.newRecord;

            //子公司是杭州厨曼，并且MES推送状态未勾选，显示推送按钮
            if (recordObj.getValue("subsidiary") == 25 && recordObj.getValue("approvalstatus") == "2"
                && !recordObj.getValue("custbody_chefman_mes_pushstatus")) {
                context.form.clientScriptModulePath = './bsw_purchaseorder_cs.js';
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
        try {
            const newRecord = context.newRecord;

            if (context.type == 'create' || context.type == "copy") {
                //子公司是杭州厨曼，生成文档编号= PO#2025+5位流水号
                if (newRecord.getValue("subsidiary") == 25) {
                    //文档编号未修改
                    const custbody_csm_mark_po = newRecord.getValue("custbody_csm_mark_po");
                    if (!custbody_csm_mark_po) {
                        const recordObj = record.load({ type: "purchaseorder", id: newRecord.id });
                        let prefix = "PO#";
                        const trandate = recordObj.getValue("trandate");
                        prefix += trandate.getFullYear();
                        const newtranid = getMaxTranid(prefix);
                        log.debug("newtranid", newtranid);
                        recordObj.setValue({ fieldId: "tranid", value: newtranid });
                        recordObj.save({ ignoreMandatoryFields: true });
                    }
                }
            }
            /**
            if (context.type == 'edit') {
                //子公司是杭州厨曼，生成文档编号= PO#2025+5位流水号
                if (newRecord.getValue("subsidiary") == 25) {
                    let prefix = "PO#";
                    const trandate = newRecord.getText("trandate");
                    prefix += trandate.substring(0, 4);
                    const tranid = newRecord.getValue("tranid");
                    if (tranid.indexOf(prefix) != 0 || tranid.length != 12) {
                        const newtranid = getMaxTranid(prefix);
                        log.debug("newtranid", newtranid);

                        const recordObj = record.load({ type: "purchaseorder", id: newRecord.id });
                        recordObj.setValue({ fieldId: "tranid", value: newtranid });
                        recordObj.save({ ignoreMandatoryFields: true });
                    }
                    
                }
            }
            */
            if (context.type != "delete") {
                //子公司是杭州厨曼, 审核通过后，推送数据到MES
                if (newRecord.getValue("subsidiary") == 25 && newRecord.getValue("custbody_chefman_hp_approvalstatus") == "2") {
                    const recordObj = record.load({ type: "purchaseorder", id: newRecord.id });
                    const responseObj = mesApiUtil.pushPurchaseOrder(recordObj);
                    log.debug("mesApiUtil.pushPurchaseOrder", responseObj);
                }
            }
        } catch (e) {
            log.error("error", e);
        }
    }

    /**
    * 获取单据最大编号
    * @param {*} prefix 前缀
    * @returns 
    */
    const getMaxTranid = (prefix) => {
        const serachFields = [
            { id: "mainline", search: { type: 'none' }, filter: { values: 'T' } },
            { id: "subsidiary", search: { type: 'none' }, filter: { values: '25' } },
            { id: "formulanumeric", search: { type: 'none', formula: "LENGTH({tranid})" }, filter: { operator: "equalto", values: "12" } },
            { id: "tranid", search: { summary: "max" }, filter: { operator: "startswith", values: prefix } }
        ];
        const dataList = bsworks.search.getSearchResultDataList("purchaseorder", serachFields, 1, 10);
        log.debug("getMaxTranid-dataList", dataList);
        let maxNumber = "00001";
        if (dataList.length > 0 && dataList[0].tranid) {
            maxNumber = dataList[0].tranid;
            maxNumber = maxNumber.replace(prefix, "");
            maxNumber = parseInt("1" + maxNumber) + 1;
            maxNumber = (maxNumber + "").substring(1);
        }
        const tranid = prefix + maxNumber;
        return tranid;
    }


    return {
        beforeLoad,
        beforeSubmit,
        afterSubmit
    }

});