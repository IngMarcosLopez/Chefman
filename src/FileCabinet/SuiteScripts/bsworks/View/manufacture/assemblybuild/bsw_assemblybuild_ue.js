/**
 * 装配件构建 用户事件
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 *
 */

define(["../../../plugin/bsworks/bsworksUtil-1.0.min", "N/record"], (bsworks, record) => {

    const beforeLoad = (context) => {
        if (context.type == "view") {
            var recordObj = context.newRecord;
            // 装配件构建单据查看界面下点击“外协转库”或“完工转库”按钮
            // 货品分类{custbody_item_catogory}为成品（ID=1)时，显示“完工转库”按钮
            // 当“外包页签”中的“链接库存转移”{linkedinventorytransfer}字段为空值并且“外包费用”{outsourcingcharge}值不为空时，显示“外协转库”按钮；


            let buttonId = "";
            //货品分类
            const itemCategory = recordObj.getValue("custbody_item_catogory");
            if (null != itemCategory && itemCategory == "1") {
                buttonId = "custpage_assemblybuild_initem";
            } else {
                //外包费用
                const outsourcingcharge = recordObj.getValue("outsourcingcharge");
                //链接库存转移
                const linkedinventorytransfer = recordObj.getValue("linkedinventorytransfer");
                if (bsworks.isNullOrEmpty(linkedinventorytransfer) && !bsworks.isNullOrEmpty(outsourcingcharge)) {
                    buttonId = "custpage_assemblybuild_outitem";
                }
            }
            //更改转库操作记录，2/NS创建（已转库）、3/MES推送（已转库）则不显示按钮
            const assemblybuild_operator = recordObj.getValue("custbody_assemblybuild_operator");
            if (!bsworks.isNullOrEmpty(buttonId) && !(assemblybuild_operator == "2" || assemblybuild_operator == "3")) {
                context.form.clientScriptModulePath = './bsw_assemblybuild_cs.js';
                context.form.addButton({
                    id: buttonId,
                    label: buttonId == "custpage_assemblybuild_outitem" ? "外协转库" : "完工转库",
                    functionName: "doCreateInventoryTransfer('" + recordObj.id + "','" + buttonId + "')"
                });
                bsworks.userEvent.beforeLoad.addButtonEventListener(context.form, [buttonId], true);
            }
        }
    }

    const beforeSubmit = (context) => {
        try {
            if (context.type != "delete") {
                const recordObj = context.newRecord;
                //获取物料清单版本的单位人工工时
                const billofmaterialsrevision = recordObj.getValue("billofmaterialsrevision");
                if (billofmaterialsrevision) {
                    const versionRecord = record.load({ type: "bomrevision", id: billofmaterialsrevision });
                    //完全自制单位人工工时
         //           let ea_person_hour = versionRecord.getValue("custrecord_ca_ea_person_hour");
                    //部分自制
                    const custbody_ca_part_product = recordObj.getValue("custbody_ca_part_product");
                    if (custbody_ca_part_product) {
                        ea_person_hour = versionRecord.getValue("custrecord_ca_part_unit_labor_hours");
                    }
                    recordObj.setValue({ fieldId: "custbody_ca_ea_person_hour", value: ea_person_hour });
                }
            }
        } catch (e) {
            log.error("error", e);
        }

    }

    return {
        beforeLoad,
        beforeSubmit
    }

});