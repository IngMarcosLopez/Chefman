/**
 * 成品成本构成明细表 sl脚本
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(["../../plugin/bsworks/bsworksUtil-2.0", "../Plat/bws_plat_common", "N/ui/serverWidget", "N/task", "N/format", "N/search", "N/runtime"],
    (bsworks, platCommon, serverWidget, task, format, search, runtime) => {


        const renderPage = (context) => {
            //参数默认值
            const endDate = bsworks.date(format).getCurrentDate();
            const startDate = bsworks.date(format).getCurrentDate(null, null, -1);
            let defaultValues = {
                // custpage_filter_start_date: startDate,
                // custpage_filter_end_date: endDate,
                custpage_bomtype: "1",
                custpage_location: "68",
                custpage_get_avgcost: "false",
                custpage_subsidiary: runtime.getCurrentUser().subsidiary
            };
            //参数值
            var parameters = context.request.parameters;
            const params = bsworks.suitelet().getRequestParamters(parameters, defaultValues);
            defaultValues = handleDefaultValues(params.defaultValues, params.pageInit);
            // log.debug("defaultValues", defaultValues)

            /**
            * suitelet表单配置
            */
            const suiteletConfig = {
                title: "成品成本构成明细表",
                scriptConfig: {
                    scriptModulePath: "/SuiteScripts/bsworks/View/Report/",
                    suiteletScriptName: "report_ica_cost_account_sl",
                    clientScriptModuleName: "bws_report_common_cs"
                },
                fieldGroupConfig: [
                    {
                        id: "custpage_fieldgroup_filter", label: "过滤器", isFilterGroup: true,
                        fields: [
                            { id: "custpage_subsidiary", label: "子公司", type: "select", source: "subsidiary", required: true },
                            { id: "custpage_tranid", label: "完工单号", type: "select", source: "assemblybuild" },
                            { id: "custpage_filter_start_date", label: "开始日期", type: "date", required: true },
                            { id: "custpage_filter_end_date", label: "结束日期", type: "date", required: true },
                            { id: "custpage_item", label: "货品编号", type: "select", source: "assemblyitem" },
                            { id: "custpage_location", label: "地点", type: "select", source: "location" },
                            { id: "custpage_bomtype", label: "BOM类型", type: "select", source: "customlist_hc_bom_type", displayType: "disabled" },
                        ],
                        buttons: []
                    }
                ],
                sublistConfig: [
                    {
                        id: bsworks.constant.suitelet.SUBLIST_ID, label: "料工费明细",
                        hasCheckbox: false, hasSummary: true, hasHeaderSort: true,
                        addMarkAllButtons: false,
                        fields: [
                            { id: "createdfrom_display_name", label: "销售订单号" },
                            { id: "tranid", label: "工单号" },
                            { id: "internalid_display_name", label: "完工单号" },
                            { id: "trandate", label: "完工日期" },
                            { id: "item_display_name", label: "货品编号" },
                            { id: "displayname", label: "货品名称" },
                            { id: "quantity", label: "完工数量" },
                            { id: "unit", label: "单位" },
                            { id: "formulacurrency_1_unit", label: "单位材料成本" },
                            { id: "formulacurrency_2_unit", label: "单位直接人工" },
                            { id: "formulacurrency_3_unit", label: "单位制造费用" },
                            { id: "formulacurrency_4_unit", label: "单位外协费用" },
                            { id: "total_unitcost", label: "单位总成本" },
                            { id: "formulacurrency_1", label: "总材料成本" },
                            { id: "formulacurrency_2", label: "总直接人工" },
                            { id: "formulacurrency_3", label: "总制造费用" },
                            { id: "formulacurrency_4", label: "总外协费用" },
                            { id: "total_cost", label: "总成本", summary: true },
                            { id: "createdfrom", label: "销售订单ID", displayType: "hidden" },
                            { id: "item", label: "货品ID", displayType: "hidden" },
                            { id: "wointernalid", label: "工单ID", displayType: "hidden" },
                            { id: "internalid", label: "装配件构建ID", displayType: "hidden" },
                        ],
                        buttons: [{ id: "custpage_button_summary", label: "合&nbsp;&nbsp;计", addEventListener: false }],
                        //
                    },
                    {
                        id: "custpage_sublist_groupcost", label: "成本构成分析",
                        // type: serverWidget.SublistType.INLINEEDITOR,
                        hasCheckbox: true, hasSummary: false, hasHeaderSort: true,
                        addMarkAllButtons: false,
                        fields: [
                            { id: "item_display_name2", label: "货品编号" },
                            { id: "displayname2", label: "货品名称" },
                            { id: "month", label: "月份" },
                            { id: "total_quantity", label: "总数量" },
                            { id: "formulacurrency_12", label: "总材料成本" },
                            { id: "formulacurrency_22", label: "总直接人工" },
                            { id: "formulacurrency_32", label: "总制造费用" },
                            { id: "formulacurrency_42", label: "总外协费用" },
                            { id: "total_cost2", label: "总成本" },
                            { id: "formulacurrency_1_unit2", label: "单位材料成本" },
                            { id: "formulacurrency_2_unit2", label: "单位直接人工" },
                            { id: "formulacurrency_3_unit2", label: "单位制造费用" },
                            { id: "formulacurrency_4_unit2", label: "单位外协费用" },
                            { id: "total_unitcost2", label: "总单位成本" },
                            { id: "item2", label: "货品ID", displayType: "hidden" },
                            { id: "subsidiary2", label: "子公司ID", displayType: "hidden" },
                        ],
                        buttons: [
                            { id: "custpage_button_checked_all", label: "全&nbsp;&nbsp;选", addEventListener: true },
                            { id: "custpage_groupcost_export_button", label: "导出EXCEL", addEventListener: false }
                        ],
                    }
                ],
                customPageScript: null
            }


            //查询明细列表数据
            const subdataObj = {};
            if (!params.pageInit) {
                const subDataList = doSearchSublistDataList(defaultValues);
                subdataObj[suiteletConfig.sublistConfig[0].id] = subDataList;

                //获取成本构成分析数据
                subdataObj[suiteletConfig.sublistConfig[1].id] = doGetAvgCost(subDataList, defaultValues);

            }
            const formObj = bsworks.suitelet(serverWidget).form.create(suiteletConfig, defaultValues, subdataObj);
            const form = formObj.form;


            // form.addButton({
            //     id: "custpage_cal_unitcost_button",
            //     label: "计算单位成本",
            // });

            // form.addButton({
            //     id: "custpage_get_avgcost_button",
            //     label: "生成平均成本",
            // });

            form.addButton({
                id: "custpage_save_cost_button",
                label: "料工费数据记录",
            });

            context.response.writePage(form);

        }

        /**
       * 查询明细列表数据
       * @param {*} defaultValues 
       * @returns 
       */
        const doSearchSublistDataList = (defaultValues) => {
            const searchFields = [
                { id: "subsidiary", label: "子公司", filter: { values: defaultValues.custpage_subsidiary } },
                { id: "createdfrom", label: "销售订单号", search: { type: "valueText" } },
                { id: "applyingtransaction", alias: "internalid", label: "完工单号", search: { type: "valueText" }, filter: { values: defaultValues.custpage_tranid } },
                { id: "item", label: "货品", search: { type: "valueText" }, filter: { values: defaultValues.custpage_item } },
                { id: "trandate", label: "日期", join: "applyingtransaction", filter: { operator: "within", values: defaultValues.custpage_filter_date } },
                { id: "location", label: "地点", join: "applyingtransaction", search: { type: "valueText" }, filter: { values: defaultValues.custpage_location } },
                { id: "internalid", alias: "wointernalid", label: "工单内部ID" }
            ];
            let resultDataList = bsworks.savedSearch(search).getSearchAllResultDataList("customsearch_ica_finishitem_wo", searchFields, 1, 1000);
            if (0 == resultDataList.length) return resultDataList;
            //处理数据
            resultDataList = handleSubdataList(resultDataList, defaultValues);
            return resultDataList;
        }


        /**
         * 处理数据
         * @param {*} resultDataList 
         * @param {*} defaultValues 
         * @returns 
         */
        const handleSubdataList = (resultDataList, defaultValues) => {
            //装配件构建ID集合
            const assemblybuildIds = [];
            //工单ID集合
            const workorderIds = [];
            resultDataList.forEach(rdata => {
                if (rdata.internalid && assemblybuildIds.indexOf(rdata.internalid) == -1) {
                    assemblybuildIds.push(rdata.internalid);
                }
                if (rdata.wointernalid && workorderIds.indexOf(rdata.wointernalid) == -1) {
                    workorderIds.push(rdata.wointernalid);
                }
            })

            /** 
            1）关联工单号的货品行，通过record记录【产品料工费信息记录】找到对应子公司下该工单号的单位直接材料，单位直接人工、单位制造费用，如果record记录中相同工单号的记录存在多条，则按完工日期匹配<完工日期的最临近的那条记录。
            2）未关联工单号的货品行，同时货品类型为装配件，根据该工单的完工日期，通过record记录【产品料工费信息记录】（或search：customsearch_ica_cost_information）匹配＜完工日期，根据货品编号+子公司查询日期最相邻的一笔记录，取数单位直接材料，单位直接人工、单位制造费用。
            3）未关联工单号的货品行，同时货品类型为库存商品，取值为search：ICA 料工费-原材料价格，并记录在“单位材料成本”。
            4）将成品完工单中，明细行的库存货品和装配件货品（不包含其他货品类型）的单位料工费金额相加，计算得出成品的料工费成本。
            */

            const searchDetailFields = [
                { id: "internalid", label: "工单ID", filter: { operator: "anyof", values: workorderIds } },
                { id: "subsidiary", label: "子公司" },
                { id: "location", label: "地点" },
                { id: "item", alias: "childwoitem", label: "子工单货品" },
                { id: "type", alias: "item_type", label: "货品类型", join: "item" },

            ];
            let reladetailDataList = bsworks.savedSearch(search).getSearchAllResultDataList("customsearch_ica_item_relation_alldetail", searchDetailFields, 1, 1000);
            searchDetailFields.push({ id: "internalid", alias: "childwointernalid", label: "子集工单ID", join: "applyingtransaction" });

            const reladetailDataList2 = bsworks.savedSearch(search).getSearchAllResultDataList("customsearch_ica_item_relation_detail", searchDetailFields, 1, 1000);
            reladetailDataList = reladetailDataList.map(rdata => {
                rdata.childwointernalid = null;
                const reldata2 = reladetailDataList2.find(data => data.internalid == rdata.internalid && data.lineuniquekey == rdata.lineuniquekey);
                if (reldata2) {
                    rdata.childwointernalid = reldata2.childwointernalid;
                }
                return rdata;
            })
            // const reladetailDataList = bsworks.savedSearch(search).getSearchAllResultDataList("customsearch_ica_item_relation_detail", searchDetailFields, 1, 1000);
            // log.debug("reladetailDataList", reladetailDataList);
            const childwointernalids = []; //子集工单的工单ID集合
            const nochildwo_assembly = []; //无子集工单的工单ID集合, 装配件
            const nochildwo_inventory = []; //无子集工单的工单ID集合, 库存商品
            reladetailDataList.forEach(rdata => {
                if (rdata.childwointernalid) {
                    if (childwointernalids.indexOf(rdata.childwointernalid) == -1) {
                        childwointernalids.push(rdata.childwointernalid);
                    }
                } else {
                    if (rdata.item_type == "Assembly") {
                        nochildwo_assembly.push({
                            wointernalid: rdata.internalid,
                            item: rdata.childwoitem

                        });
                    } else {
                        nochildwo_inventory.push({
                            wointernalid: rdata.internalid,
                            item: rdata.childwoitem,
                            location: rdata.location
                        });
                    }

                }
            })
            // log.debug("childwointernalids", { childwointernalids, nochildwo_assembly, nochildwo_inventory });
            //关联工单号的货品行，通过record记录【产品料工费信息记录】找到对应子公司下该工单号的单位直接材料，单位直接人工、单位制造费用，如果record记录中相同工单号的记录存在多条，则按完工日期匹配<完工日期的最临近的那条记录。
            let woRecordDataList = [];
            if (childwointernalids.length > 0) {
                const worecsearchFields = [
                    { id: "custrecord_ica_icr_wo_number", alias: "wointernalid", label: "工单ID", filter: { operator: "anyof", values: childwointernalids } },
                    { id: "custrecord_ica_icr_subsidiary", alias: "subsidiary", label: "子公司", filter: { values: defaultValues.custpage_subsidiary } },
                    { id: "custrecord_ica_icr_pre_material", alias: "formulacurrency_1_unit", label: "单位材料成本" },
                    { id: "custrecord_ica_icr_pre_labor", alias: "formulacurrency_2_unit", label: "单位直接人工" },
                    { id: "custrecord_ica_icr_pre_manufacture", alias: "formulacurrency_3_unit", label: "单位制造费用" },
                    { id: "custrecord_ica_icr_total_pre_outexpense", alias: "formulacurrency_4_unit", label: "单位外协费用" },
                    { id: "custrecord_ica_icr_build_date", alias: "trandate", label: "完工日期" },
                    { id: "custrecord_ica_icr_item_code", alias: "item", label: "货品ID" },
                ];
                woRecordDataList = bsworks.search(search).getSearchAllResultDataList("customrecord_ica_item_cost_record", worecsearchFields, 1, 1000);
                // log.debug("woRecordDataList", woRecordDataList);
            }

            //未关联工单号的货品行，同时货品类型为装配件，根据该工单的完工日期，通过record记录【产品料工费信息记录】（或search：customsearch_ica_cost_information）匹配＜完工日期，根据货品编号+子公司查询日期最相邻的一笔记录，取数单位直接材料，单位直接人工、单位制造费用。
            let woAssemblyDataList = [];
            if (nochildwo_assembly.length > 0) {
                const items = [];
                nochildwo_assembly.forEach(ndata => {
                    if (items.indexOf(ndata.item) == -1) {
                        items.push(ndata.item);
                    }
                })

                const woassSearchFields = [
                    { id: "custrecord_ica_icr_item_code", alias: "item", label: "货品ID", filter: { operator: "anyof", values: items } },
                    { id: "custrecord_ica_icr_subsidiary", alias: "subsidiary", label: "子公司", filter: { values: defaultValues.custpage_subsidiary } },
                    { id: "custrecord_ica_icr_pre_material", alias: "formulacurrency_1_unit", label: "单位材料成本" },
                    { id: "custrecord_ica_icr_pre_labor", alias: "formulacurrency_2_unit", label: "单位直接人工" },
                    { id: "custrecord_ica_icr_pre_manufacture", alias: "formulacurrency_3_unit", label: "单位制造费用" },
                    { id: "custrecord_ica_icr_total_pre_outexpense", alias: "formulacurrency_4_unit", label: "单位外协费用" },
                    { id: "custrecord_ica_icr_build_date", alias: "trandate", label: "完工日期" }
                ];
                woAssemblyDataList = bsworks.search(search).getSearchAllResultDataList("customrecord_ica_item_cost_record", woassSearchFields, 1, 1000);
                // log.debug("woAssemblyDataList", woAssemblyDataList);
            }

            //未关联工单号的货品行，同时货品类型为库存商品，取值为search：ICA 料工费-原材料价格，并记录在“单位材料成本”。
            let woInventoryDataList = [];
            if (nochildwo_inventory.length > 0) {
                const itemIds = [];
                const locationIds = [];
                nochildwo_inventory.forEach(nodata => {
                    itemIds.push(nodata.item);
                    locationIds.push(nodata.location);
                })

                const itemSearchFields = [
                    { id: "internalid", filter: { operator: "anyof", values: itemIds } },
                    { id: "inventorylocation", label: "库存地点", filter: { operator: "anyof", values: locationIds } },
                ];
                woInventoryDataList = bsworks.savedSearch(search).getSearchAllResultDataList("customsearch_ica_raw_avgcost", itemSearchFields, 1, 1000);
                // log.debug("woInventoryDataList", woInventoryDataList);
            }


            resultDataList = resultDataList.map((data) => {
                //总单位料工费
                let total_formulacurrency_1_unit = 0;
                let total_formulacurrency_2_unit = 0;
                let total_formulacurrency_3_unit = 0;
                let total_formulacurrency_4_unit = 0;
                const detailDataList = reladetailDataList.filter(adata => data.wointernalid == adata.internalid);
                if (detailDataList.length > 0) {
                    detailDataList.forEach(reldata => {
                        //关联工单号的货品行，通过record记录【产品料工费信息记录】找到对应子公司下该工单号的单位直接材料，单位直接人工、单位制造费用，如果record记录中相同工单号的记录存在多条，则按完工日期匹配<完工日期的最临近的那条记录。
                        if (reldata.childwointernalid) {
                            const recordDataList = woRecordDataList.filter(wdata => wdata.wointernalid == reldata.childwointernalid);
                            if (recordDataList.length > 0) {
                                let recordData = recordDataList[0];
                                if (recordDataList.length > 1) {
                                    //按完工日期匹配<完工日期的最临近的那条记录
                                    const newrecordDataList = recordDataList.filter(rdata => rdata.trandate <= data.trandate);
                                    if (newrecordDataList.length > 0) {
                                        recordData = newrecordDataList[0];
                                        for (let i = 1; i < newrecordDataList.length; i++) {
                                            const newrecordData = newrecordDataList[i];
                                            if (recordData.trandate < newrecordData.trandate) {
                                                recordData = newrecordData;
                                            }
                                        }
                                    }
                                }

                                total_formulacurrency_1_unit = parseFloat(total_formulacurrency_1_unit) + (parseFloat(recordData.formulacurrency_1_unit) || 0);
                                total_formulacurrency_2_unit = parseFloat(total_formulacurrency_2_unit) + (parseFloat(recordData.formulacurrency_2_unit) || 0);
                                total_formulacurrency_3_unit = parseFloat(total_formulacurrency_3_unit) + (parseFloat(recordData.formulacurrency_3_unit) || 0);
                                total_formulacurrency_4_unit = parseFloat(total_formulacurrency_4_unit) + (parseFloat(recordData.formulacurrency_4_unit) || 0);

                            }

                        } else {
                            //未关联工单号的货品行，同时货品类型为装配件，根据该工单的完工日期，通过record记录【产品料工费信息记录】（或search：customsearch_ica_cost_information）匹配＜完工日期，根据货品编号+子公司查询日期最相邻的一笔记录，取数单位直接材料，单位直接人工、单位制造费用。
                            if (reldata.item_type == "Assembly") {
                                const recordDataList = woAssemblyDataList.filter(wdata => wdata.item == reldata.childwoitem && wdata.subsidiary == reldata.subsidiary);
                                if (recordDataList.length > 0) {
                                    let recordData = recordDataList[0];
                                    if (recordDataList.length > 1) {
                                        //按完工日期匹配<完工日期的最临近的那条记录
                                        const newrecordDataList = recordDataList.filter(rdata => rdata.trandate <= data.trandate);
                                        if (newrecordDataList.length > 0) {
                                            recordData = newrecordDataList[0];
                                            for (let i = 1; i < newrecordDataList.length; i++) {
                                                const newrecordData = newrecordDataList[i];
                                                if (recordData.trandate < newrecordData.trandate) {
                                                    recordData = newrecordData;
                                                }
                                            }
                                        }
                                    }
                                    total_formulacurrency_1_unit = parseFloat(total_formulacurrency_1_unit) + (parseFloat(recordData.formulacurrency_1_unit) || 0);
                                    total_formulacurrency_2_unit = parseFloat(total_formulacurrency_2_unit) + (parseFloat(recordData.formulacurrency_2_unit) || 0);
                                    total_formulacurrency_3_unit = parseFloat(total_formulacurrency_3_unit) + (parseFloat(recordData.formulacurrency_3_unit) || 0);
                                    total_formulacurrency_4_unit = parseFloat(total_formulacurrency_4_unit) + (parseFloat(recordData.formulacurrency_4_unit) || 0);
                                }
                            }

                            //未关联工单号的货品行，同时货品类型为库存商品，取值为search：ICA 料工费-原材料价格，并记录在“单位材料成本”。
                            else {
                                const itemdata = woInventoryDataList.find(wdata => wdata.internalid == reldata.childwoitem
                                    && wdata.inventorylocation == reldata.location);
                                if (itemdata) {
                                    total_formulacurrency_1_unit = parseFloat(total_formulacurrency_1_unit) + (parseFloat(itemdata.locationaveragecost) || 0);
                                }
                            }
                        }
                    })

                }

                //单位料工费
                data.formulacurrency_1_unit = parseFloat(total_formulacurrency_1_unit).toFixed(6);
                data.formulacurrency_2_unit = parseFloat(total_formulacurrency_2_unit).toFixed(6);
                data.formulacurrency_3_unit = parseFloat(total_formulacurrency_3_unit).toFixed(6);
                data.formulacurrency_4_unit = parseFloat(total_formulacurrency_4_unit).toFixed(6);

                //计算总单位成本
                data.total_unitcost = (parseFloat(data.formulacurrency_1_unit) + parseFloat(data.formulacurrency_2_unit)
                    + parseFloat(data.formulacurrency_3_unit) + parseFloat(data.formulacurrency_4_unit)).toFixed(6);

                //计算总料工费
                data.formulacurrency_1 = ((parseFloat(data.formulacurrency_1_unit) || 0) * (parseFloat(data.quantity) || 0)).toFixed(2);
                data.formulacurrency_2 = ((parseFloat(data.formulacurrency_2_unit) || 0) * (parseFloat(data.quantity) || 0)).toFixed(2);
                data.formulacurrency_3 = ((parseFloat(data.formulacurrency_3_unit) || 0) * (parseFloat(data.quantity) || 0)).toFixed(2);
                data.formulacurrency_4 = ((parseFloat(data.formulacurrency_4_unit) || 0) * (parseFloat(data.quantity) || 0)).toFixed(2);
                data.total_cost = (parseFloat(data.formulacurrency_1) + parseFloat(data.formulacurrency_2)
                    + parseFloat(data.formulacurrency_3) + parseFloat(data.formulacurrency_4)).toFixed(2);

                return data;
            })

            // log.debug("resultDataList", resultDataList);
            return resultDataList;

        }

        /**
        * 创建成本构成分析
        * @param {*} subdataList 
        * @returns 
        */
        const doGetAvgCost = (subdataList, defaultValues) => {
            const groupdataObj = {};
            subdataList.forEach(subdata => {
                const key = subdata.item_display_name + "#" + subdata.displayname
                    + "#" + (subdata.trandate).substring(0, 7);
                if (null == groupdataObj[key]) {
                    groupdataObj[key] = [];
                }
                groupdataObj[key].push(subdata);
            })
            const subsidiary = defaultValues.custpage_subsidiary;
            const newDataList = [];
            let line_num = 1;
            for (const key in groupdataObj) {
                const groupDataList = groupdataObj[key];
                const groupData0 = groupDataList[0];
                const newdata = {
                    sublist_line_num1: line_num,
                    subsidiary2: subsidiary,
                    item2: groupData0.item,
                    item_display_name2: groupData0.item_display_name,
                    displayname2: groupData0.displayname,
                    month: (groupData0.trandate).substring(0, 7),
                    total_quantity: groupData0.quantity,
                    formulacurrency_12: groupData0.formulacurrency_1,
                    formulacurrency_22: groupData0.formulacurrency_2,
                    formulacurrency_32: groupData0.formulacurrency_3,
                    formulacurrency_42: groupData0.formulacurrency_4,
                    total_cost2: 0,
                    formulacurrency_1_unit2: 0,
                    formulacurrency_2_unit2: 0,
                    formulacurrency_3_unit2: 0,
                    formulacurrency_4_unit2: 0,
                    total_unitcost2: 0
                };

                for (let g = 1; g < groupDataList.length; g++) {
                    const groupdata = groupDataList[g];
                    newdata.total_quantity = (parseFloat(newdata.total_quantity) || 0) + (parseFloat(groupdata.quantity) || 0);
                    newdata.formulacurrency_12 = (parseFloat(newdata.formulacurrency_12) || 0) + (parseFloat(groupdata.formulacurrency_1) || 0);
                    newdata.formulacurrency_22 = (parseFloat(newdata.formulacurrency_22) || 0) + (parseFloat(groupdata.formulacurrency_2) || 0);
                    newdata.formulacurrency_32 = (parseFloat(newdata.formulacurrency_32) || 0) + (parseFloat(groupdata.formulacurrency_3) || 0);
                    newdata.formulacurrency_42 = (parseFloat(newdata.formulacurrency_42) || 0) + (parseFloat(groupdata.formulacurrency_4) || 0);
                }
                newdata.formulacurrency_12 = parseFloat(newdata.formulacurrency_12).toFixed(2);
                newdata.formulacurrency_22 = parseFloat(newdata.formulacurrency_22).toFixed(2);
                newdata.formulacurrency_32 = parseFloat(newdata.formulacurrency_32).toFixed(2);
                newdata.formulacurrency_42 = parseFloat(newdata.formulacurrency_42).toFixed(2);
                newdata.total_cost2 = ((parseFloat(newdata.formulacurrency_12) || 0) + (parseFloat(newdata.formulacurrency_22) || 0)
                    + (parseFloat(newdata.formulacurrency_32) || 0) + (parseFloat(newdata.formulacurrency_42) || 0)).toFixed(2);

                newdata.formulacurrency_1_unit2 = (parseFloat(newdata.formulacurrency_12) || 0) / parseFloat(newdata.total_quantity);
                newdata.formulacurrency_2_unit2 = (parseFloat(newdata.formulacurrency_22) || 0) / parseFloat(newdata.total_quantity);
                newdata.formulacurrency_3_unit2 = (parseFloat(newdata.formulacurrency_32) || 0) / parseFloat(newdata.total_quantity);
                newdata.formulacurrency_4_unit2 = (parseFloat(newdata.formulacurrency_42) || 0) / parseFloat(newdata.total_quantity);

                newdata.formulacurrency_1_unit2 = parseFloat(newdata.formulacurrency_1_unit2).toFixed(6);
                newdata.formulacurrency_2_unit2 = parseFloat(newdata.formulacurrency_2_unit2).toFixed(6);
                newdata.formulacurrency_3_unit2 = parseFloat(newdata.formulacurrency_3_unit2).toFixed(6);
                newdata.formulacurrency_4_unit2 = parseFloat(newdata.formulacurrency_4_unit2).toFixed(6);
                newdata.total_unitcost2 = (parseFloat(newdata.formulacurrency_1_unit2) + parseFloat(newdata.formulacurrency_2_unit2)
                    + parseFloat(newdata.formulacurrency_3_unit2) + parseFloat(newdata.formulacurrency_4_unit2)).toFixed(6);


                newDataList.push(newdata);
                line_num++;
            }

            return newDataList;

        }


        /**
         * 默认值处理
         * @param {*} defaultValues 
         * @returns 
         */
        const handleDefaultValues = (defaultValues, pageInit) => {
            if (!pageInit) {

            }

            return defaultValues;
        }

        const onRequest = (context) => {
            //参数值
            var requestBody = context.request.body;
            if (!bsworks.isNullOrEmpty(requestBody)) {
                let responseObject = bsworks.https().getSuccessResponse();
                try {
                    requestBody = JSON.parse(requestBody);
                    responseObject = platCommon.onRequest(requestBody, task);
                } catch (e) {
                    log.error("onRequest", e);
                    responseObject.status = "fail";
                    responseObject.message = e.message;
                }
                context.response.write(JSON.stringify(responseObject));
            } else {
                renderPage(context);
            }
        }

        return {
            onRequest: onRequest
        }
    });