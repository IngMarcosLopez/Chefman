/**
 * CA 工费科目发生额 用户事件
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 *
 */

define(["../../plugin/bsworks/bsworksUtil-1.0.min", "N/record"], (bsworks, record) => {

    const beforeLoad = (context) => {
        if (context.type == "view") {
            const form = context.form;
            form.clientScriptModulePath = './bsw_account_incurrence_cs.js';
            const recordObj = context.newRecord;

            const itemButtonId = "custpage_account_initem";
            const initemButton = form.addButton({
                id: itemButtonId,
                label: "执行取数",
                functionName: "doGetAccountItem('" + recordObj.id + "','" + itemButtonId + "')"
            });
            // const castatus = recordObj.getValue("custrecord_ca_ai_status");
            // if (castatus && castatus != "1") {
            //     initemButton.isDisabled = true;
            // }

            const journalButtonId = "custpage_journal_setting";
            const journalButton = form.addButton({
                id: journalButtonId,
                label: "日记账结转",
                functionName: "doJournalSetting('" + recordObj.id + "','" + journalButtonId + "')"
            });

            const reljournal = recordObj.getValue("custrecord_ca_ai_relation_journey");
            if (reljournal != null && reljournal.length > 0) {
                journalButton.isDisabled = true;
            }
            bsworks.userEvent.beforeLoad.addButtonEventListener(form, [itemButtonId, journalButtonId], true);
            bsworks.userEvent.beforeLoad.removeViewSublistButton(form, ["recmachcustrecord_ca_ai_relation_net_amount"]);


        }
    }

    const beforeSubmit = (context) => {
        try {
            if (context.type == "delete") {
                const recordObj = context.newRecord;
                bsworks.userEvent.beforeSubmit.deleteSublist(recordObj);
            }
        } catch (e) {
            log.error("beforeSubmit", e);
        }
    }

    const afterSubmit = (context) => {
        try {
            if (context.type == "delete") {
                const recordObj = context.oldRecord;
                const reljournal = recordObj.getValue("custrecord_ca_ai_relation_journey");
                if (reljournal && reljournal.length > 0) {
                    reljournal.forEach(id => {
                        if (id) {
                            record.delete({ type: record.Type.JOURNAL_ENTRY, id: id });
                        }

                    })
                }
            }
        } catch (e) {
            log.error("afterSubmit", e);
        }
    }



    return {
        beforeLoad,
        beforeSubmit,
        afterSubmit
    }

});