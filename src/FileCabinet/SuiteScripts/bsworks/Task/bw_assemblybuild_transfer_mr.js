/**
 * 装配件构建库存转移 map/reduce脚本
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */

define(["../plugin/bsworks/bsworksUtil-1.0.min", "../View/manufacture/assemblybuild/bsw_assemblybuild_util", "N/record"], (bsworks, assemblyUtil, record) => {


    const getInputData = (context) => {
        //拉取装配件构建转库操作记录为空的记录
        const dataList = getAssemblybuildDataList();
        // log.debug("getInputData", dataList);
        return dataList;
    }

    const getAssemblybuildDataList = () => {
        const searchFields = [
            { id: "mainline", search: { type: "none" }, filter: { values: "T" } },
            { id: "location", label: "地点", search: { type: "none" }, filter: { operator: "noneof", values: "40" } },
            { id: "trandate", search: { type: "none", sort: "DESC" }, filter: { operator: "within", values: ["2025-06-01", "2050-01-01"] } },
            { id: "subsidiary", label: "子公司", search: { type: "none" }, filter: { values: "25" } },
            { id: "custbody_csm_assemblubuild_mark", label: "标记不需要转库", search: { type: "none" }, filter: { values: "F" } },
            { id: "custbody_assemblybuild_operator", label: "转库操作记录", search: { type: "none" }, filter: { operator: "anyof", values: "@NONE@" } },
            { id: "custrecord_hc_bom_type", label: "BOM类型", join: "bom", filter: { operator: "anyof", values: ["1", "3"] } },
            { id: "internalid", label: "内部ID" }
        ];
        const dataList = bsworks.search.getSearchResultDataList("assemblybuild", searchFields, 1, 1000, null);
        log.debug("getAssemblybuildDataList", dataList.length);
        return dataList;
    }


    const map = (context) => {
        //采购订单单条主数据
        const assemblyData = JSON.parse(context.value);
        //调用接口执行库存转移操作
        try {
            const recordObj = record.load({ type: "assemblybuild", id: assemblyData.internalid });
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
                const requestData = { recordId: recordObj.id, buttonId: buttonId, assemblybuild_operator: "3" };
                const responseObject = assemblyUtil.doCreateInventoryTransfer(requestData);
                log.debug("执行库存转移操作", responseObject);
            }
        } catch (e) {
            log.error("执行库存转移操作" + context.value, e);
        }


    }


    const reduce = (context) => {
        log.debug('reduce', JSON.stringify(context));
    }

    const summarize = (context) => {
        if (context.mapSummary.errors) {
            context.mapSummary.errors.iterator().each(function (key, value) {
                log.error(key, value);
                return true;
            });
        }
    }

    return { getInputData, map, summarize }
})