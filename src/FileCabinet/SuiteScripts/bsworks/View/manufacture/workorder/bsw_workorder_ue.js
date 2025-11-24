/**
 * 工单 用户事件
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 *
 */

define(["../../../plugin/bsworks/bsworksUtil-1.0.min", "N/record"], (bsworks, record) => {

    const beforeLoad = (context) => {
        if (context.type == "view") {
            context.form.clientScriptModulePath = './bsw_workorder_cs.js';
            var recordObj = context.newRecord;
            //1.工单查看界面下点击“车间备料”或“外协备料”按钮，同时需要当状态{orderstatus}为"已发布"&"进行中"时才显示该按钮，
            //并且当“外包页签”中的“外包”{outsourced}字段的复选框勾选时，显示“外协备料”按钮,否则显示“车间备料”按钮。
            const orderstatus = recordObj.getText("orderstatus");
            if (orderstatus == "进行中" || orderstatus == "已发布" || orderstatus == "已计划") {


                const outsourced = recordObj.getValue("outsourced");
                let buttonId = "custpage_workorder_outitem";
                if (outsourced) {
                    context.form.addButton({
                        id: buttonId,
                        label: "外协备料",
                        functionName: "doTargetPickItemPage('" + recordObj.id + "','" + buttonId + "')"
                    });
                } else {
                    buttonId = "custpage_workorder_initem";
                    context.form.addButton({
                        id: buttonId,
                        label: "车间备料",
                        functionName: "doTargetPickItemPage('" + recordObj.id + "','" + buttonId + "')"
                    });
                }

                const buttonIds = [];
                buttonIds.push(buttonId);

                //子公司是杭州厨曼，并且MES推送状态未勾选，显示推送按钮
                if (recordObj.getValue("subsidiary") == 25 && !recordObj.getValue("custbody_chefman_mes_pushstatus")) {
                    let pushButtonId = "custpage_push_to_mes";
                    context.form.addButton({
                        id: pushButtonId,
                        label: "推送到MES",
                        functionName: "doPushToMes('" + recordObj.id + "','" + pushButtonId + "')"
                    });
                    buttonIds.push(pushButtonId);
                }

                bsworks.userEvent.beforeLoad.addButtonEventListener(context.form, buttonIds, true);
            } else {
                //子公司是杭州厨曼，并且MES推送状态未勾选，显示推送按钮
                if (recordObj.getValue("subsidiary") == 25 && !recordObj.getValue("custbody_chefman_mes_pushstatus")) {
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
    }

    const beforeSubmit = (context) => {
        try {

            if (context.type != "delete") {
                //设置本地同步状态为“未同步”，如果是通过restlet接口调用执行保存操作，则不执行
                const apiSyncStatus = context.newRecord.getValue("bsworks_api_sync_status");
                if (bsworks.isNullOrEmpty(apiSyncStatus)) {
                    context.newRecord.setValue({ fieldId: "custbody_chefman_mes_pushstatus", value: false });
                }

                const recordObj = context.newRecord;
                const subsidiary = recordObj.getValue("subsidiary");
                const searchFields = [{ id: "custrecord_ca_rules_subsidiary", join: "custrecord_ca_rules_list_relation", filter: { values: subsidiary } }];
                const dataList = bsworks.savedSearch.getSearchResultDataList("customsearch_ca_allocation_rules_list", searchFields, 1, 1000);
                if (dataList.length > 0) {
                    const items = [];
                    const lineCount = recordObj.getLineCount({ sublistId: "item" });
                    for (let line = 0; line < lineCount; line++) {
                        const item = recordObj.getSublistValue({ sublistId: "item", fieldId: "item", line: line });
                        items.push(item);
                    }

                    dataList.forEach(data => {
                        if (items.indexOf(data.custrecord_ca_rules_list_item) == -1) {
                            const newlineCount = recordObj.getLineCount({ sublistId: "item" });
                            recordObj.insertLine({ sublistId: "item", line: newlineCount });
                            recordObj.setSublistValue({ sublistId: "item", fieldId: "item", value: data.custrecord_ca_rules_list_item, line: newlineCount });
                            recordObj.setSublistValue({ sublistId: "item", fieldId: "bomquantity", value: 0, line: newlineCount });
                        }
                    })
                }

                //获取物料清单版本对应的单位人工工时和单位机器工时
                const billofmaterialsrevision = recordObj.getValue("billofmaterialsrevision");
                if (billofmaterialsrevision) {
                    const versionRecord = record.load({ type: "bomrevision", id: billofmaterialsrevision });
                    recordObj.setValue({ fieldId: "custbody_ca_ea_person_hour", value: versionRecord.getValue("custrecord_ca_ea_person_hour") });
                    recordObj.setValue({ fieldId: "custbody_ca_ea_machine_hour", value: versionRecord.getValue("custrecord_ca_ea_machine_hour") });
                }


            }
        } catch (e) {
            log.error("beforeSubmit", e);
        }
    }

    return {
        beforeLoad,
        beforeSubmit
    }

});