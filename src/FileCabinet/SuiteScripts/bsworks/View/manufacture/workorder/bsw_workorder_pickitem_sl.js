/**
 * 工单-库存转移 SL事件
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 *
 */

define(["../../../plugin/bsworks/bsworksUtil-1.0.min", "N/ui/serverWidget", "N/record"], (bsworks, serverWidget, record) => {

    //数字保留小数位
    const number_toFixed = 8;

    const renderPage = (context) => {
        //请求参数
        var parameters = context.request.parameters;
        //页面默认值
        let defaultValues = {
            custpage_pickitem_type: parameters.title,
            custpage_pickitem_package: "F",
            custpage_csm_picking_todo: ""
        };
        const params = bsworks.suitelet.getRequestParamters(parameters, defaultValues);
        defaultValues = handleDefaultValues(parameters.recordId, params.defaultValues);
        // log.debug("defaultValues", defaultValues)

        //根据子公司获取仓库数据
        const subsidiarys = [defaultValues.custpage_subsidiary];
        const locationList = bsworks.search.searchDataList("location", { subsidiarys: subsidiarys });
        const locationOptions = [];
        locationList.forEach(location => {
            locationOptions.push({ value: location.internalid, text: location.name });
        })

        /**
         * suitelet表单配置
         */
        const suiteletConfig = {
            title: parameters.title, hideNavBar: true,
            scriptConfig: {
                scriptModulePath: "/SuiteScripts/bsworks/View/manufacture/workorder/",
                suiteletScriptName: "bsw_workorder_pickitem_sl",
                clientScriptModuleName: "bsw_workorder_pickitem_cs"
            },
            fieldGroupConfig: [
                {
                    id: "custpage_fieldgroup_filter", label: "主要信息",
                    layoutConfig: { colNum: 4, lastColRight: true },
                    fields: [
                        { id: "custpage_trandate", label: "日期", type: "date", displayType: "disabled" },
                        { id: "custpage_pickitem_type", label: "备料类型", displayType: "disabled" },
                        { id: "custpage_tranid", label: "工单号", displayType: "disabled" },
                        { id: "custpage_pickitem_package", label: "是否按套领料", type: "checkbox", displayType: defaultValues.custpage_pickitem_package == "T" ? "disabled" : "normal" },
                        { id: "custpage_assemblyitem_display_name", label: "装配件", displayType: "disabled" },
                        { id: "custpage_custbody5", label: "货品名称", displayType: "disabled" },
                        { id: "custpage_quantity", label: "数量", type: "float", displayType: "disabled" },
                        { id: "custpage_csm_picking_set", label: "已领料套数", type: "float", displayType: "disabled" },
                        { id: "custpage_csm_picking_todo", label: "需领料套数", type: "float", displayType: defaultValues.custpage_pickitem_package == "T" ? "normal" : "disabled" },
                        { id: "custpage_billofmaterials_display_name", label: "物料清单", displayType: "disabled" },
                        { id: "custpage_billofmaterialsrevision_display_name", label: "物料清单版本", displayType: "disabled" },
                        { id: "custpage_subsidiary_display_name", label: "子公司", displayType: "disabled" },
                        { id: "custpage_subsidiary", label: "子公司", displayType: "hidden" },
                        { id: "custpage_location_form", label: "地点自", type: "select", selectOptions: locationOptions, showEmptyItem: false },
                        // { id: "custpage_location_display_name", label: "地点至", displayType: "disabled" },
                        // { id: "custpage_location", label: "地点至", displayType: "hidden" },
                        { id: "custpage_location", label: "地点至", type: "select", selectOptions: locationOptions, showEmptyItem: false },
                        { id: "custpage_internalid", label: "内部id", displayType: "hidden" },
                        { id: "custpage_assemblyitem", label: "装配件", displayType: "hidden" },
                        { id: "custpage_billofmaterials", label: "物料清单", displayType: "hidden" },
                        { id: "custpage_billofmaterialsrevision", label: "物料清单版本", displayType: "hidden" },
                    ],
                    buttons: []
                },
            ],
            sublistConfig: [
                {
                    id: bsworks.constant.suitelet.SUBLIST_ID, label: "货品明细",
                    hasCheckbox: true, hasSummary: false, hasHeaderSort: true,
                    addMarkAllButtons: true,
                    fields: [
                        { id: "item_display_name", label: "货品", search: { type: "none" } },
                        { id: "custcol_hc_item_name", label: "货品名称", search: { type: "none" } },
                        { id: "custcol_hc_item_size", label: "规格型号", search: { type: "none" } },
                        { id: "stockunit_display_name", label: "库存单位", search: { type: "none" } },
                        { id: "units_display_name", label: "单位", search: { type: "none" } },
                        { id: "quantityavailable", label: "可用量", type: "float", search: { type: "none" } },
                        { id: "quantityonhand", label: "现有量", type: "float", search: { type: "none" } },
                        { id: "quantity", label: "待转移数量", type: "float", displayType: "entry", search: { type: "none" } },
                        { id: "quantity_orig", label: "数量", type: "float", search: { type: "none" }, },
                        { id: "custcol_workshop_stock_qty", label: "备料数量", type: "float", search: { type: "none" }, },
                        { id: "item", label: "货品", search: { type: "none" }, displayType: "hidden" },
                        { id: "units", label: "单位id", search: { type: "none" }, displayType: "hidden" },
                        { id: "stockunit", label: "库存单位id", search: { type: "none" }, displayType: "hidden" },
                        { id: "line", label: "行号", search: { type: "none" }, displayType: "hidden" },
                    ],
                    buttons: [],
                }
            ],
            customPageScript: null
        }
        //明细列表数据
        let subdataObj = defaultValues.subdataObj;
        const formObj = bsworks.suitelet.form.create(serverWidget, suiteletConfig, defaultValues, subdataObj);

        formObj.form.addSubmitButton({
            label: "创建库存转移单",
        });
        context.response.writePage(formObj.form);

    }

    /**
     * 默认值处理
     * @param {*} defaultValues 
     * @returns 
     */
    const handleDefaultValues = (recordId, defaultValues) => {
        const recordObj = record.load({ type: "workorder", id: recordId });
        const custpage_quantity = recordObj.getValue("quantity");
        const pickingSet = recordObj.getValue("custbody_csm_picking_set");
        defaultValues.custpage_quantity = custpage_quantity;
        defaultValues.custpage_csm_picking_set = pickingSet;
        if ((parseFloat(pickingSet) || 0) > 0) {
            defaultValues.custpage_pickitem_package = "T"; //是否按套领料
            defaultValues.custpage_csm_picking_todo = bsworks.number.toFixed(((parseFloat(custpage_quantity) || 0) - (parseFloat(pickingSet) || 0)), number_toFixed);
        }
        //当子公司ID=25时，自地点为厨曼杭州；
        defaultValues.custpage_subsidiary = recordObj.getValue("subsidiary");
        if (defaultValues.custpage_subsidiary == "25") {
            defaultValues.custpage_location_form = "32";
        }

        //地点至默认从工单获取
        const location = recordObj.getValue("location");
        if (location) {
            defaultValues.custpage_location = location;
        }

        const sublistId = bsworks.constant.suitelet.SUBLIST_ID;
        let subdataList = [];
        const lineCount = recordObj.getLineCount({ sublistId: "item" });
        if (lineCount > 0) {
            const items = [];
            let sublist_line_num = 0;
            for (let line = 0; line < lineCount; line++) {
                //已承诺数量
                const quantitycommitted = recordObj.getSublistValue({ sublistId: "item", fieldId: "quantitycommitted", line: line });
                if (bsworks.isNullOrEmpty(quantitycommitted)) continue;
                sublist_line_num++;
                const subdata = {
                    sublist_line_num: sublist_line_num,
                    item_display_name: recordObj.getSublistText({ sublistId: "item", fieldId: "item", line: line }),
                    item: recordObj.getSublistValue({ sublistId: "item", fieldId: "item", line: line }),
                    custcol_hc_item_name: recordObj.getSublistValue({ sublistId: "item", fieldId: "custcol_hc_item_name", line: line }),
                    custcol_hc_item_size: recordObj.getSublistValue({ sublistId: "item", fieldId: "custcol_hc_item_size", line: line }),
                    units_display_name: recordObj.getSublistText({ sublistId: "item", fieldId: "units", line: line }),
                    units: recordObj.getSublistValue({ sublistId: "item", fieldId: "units", line: line }),
                    quantityavailable: recordObj.getSublistValue({ sublistId: "item", fieldId: "quantityavailable", line: line }),
                    quantity_orig: recordObj.getSublistValue({ sublistId: "item", fieldId: "quantity", line: line }),
                    custcol_workshop_stock_qty: recordObj.getSublistValue({ sublistId: "item", fieldId: "custcol_workshop_stock_qty", line: line }),
                    line: recordObj.getSublistValue({ sublistId: "item", fieldId: "line", line: line }),
                }
                const quantity = (parseFloat(subdata.quantity_orig) || 0) - (parseFloat(subdata.custcol_workshop_stock_qty) || 0);
                subdata["quantity"] = bsworks.number.toFixed(parseFloat(quantity), number_toFixed);
                subdataList.push(subdata);
                items.push(subdata.item);
            }
            //获取库存详情数据
            const locations = [];
            if (null != defaultValues.custpage_location_form) {
                locations.push(defaultValues.custpage_location_form);
            }
            const filters = { items: items, locations: locations };
            const inventoryDetailList = bsworks.search.searchDataList("inventorybalance", filters);
            //单位转换率
            const transferrateList = doGetUnitTransferRateList();
            subdataList = subdataList.map(subdata => {
                const inventoryItem = inventoryDetailList.find(item => item.item == subdata.item && item.binnumber == "1");
                let quantityavailable = 0; //可用量
                let quantityonhand = 0; //现有量
                if (null != inventoryItem && (parseFloat(inventoryItem.available) || 0) > 0) {
                    quantityavailable = inventoryItem.available;
                    quantityonhand = inventoryItem.onhand;
                    subdata.stockunit = inventoryItem.stockunit;
                    subdata.stockunit_display_name = inventoryItem.stockunit_display_name;
                }
                //工单单位和库存单位不一致时，数量= 数量*转化率
                if (subdata.stockunit && subdata.units != subdata.stockunit) {
                    const transferRateObj = transferrateList.find(transfer => transfer.custrecord_chefman_wo_unit == subdata.units && transfer.custrecord_chefman_in_units == subdata.stockunit);
                    if (transferRateObj && transferRateObj.custrecord_chefman_transfer_rate) {
                        const transrate = parseFloat(transferRateObj.custrecord_chefman_transfer_rate) || 1;
                        quantityavailable = parseFloat(quantityavailable) * parseFloat(transrate);
                        quantityonhand = parseFloat(quantityonhand) * parseFloat(transrate);
                    }
                }

                subdata.quantityavailable = quantityavailable;
                subdata.quantityonhand = quantityonhand;


                return subdata;
            })
        }
        //明细数据
        const subdataObj = {};
        subdataObj[sublistId] = subdataList;
        defaultValues = {
            ...defaultValues,
            custpage_trandate: recordObj.getValue("trandate"),
            custpage_tranid: recordObj.getValue("tranid"),
            custpage_assemblyitem: recordObj.getValue("assemblyitem"),
            custpage_assemblyitem_display_name: recordObj.getText("assemblyitem"),
            custpage_custbody5: recordObj.getText("custbody5"),
            custpage_billofmaterials: recordObj.getValue("billofmaterials"),
            custpage_billofmaterials_display_name: recordObj.getText("billofmaterials"),
            custpage_billofmaterialsrevision: recordObj.getValue("billofmaterialsrevision"),
            custpage_billofmaterialsrevision_display_name: recordObj.getText("billofmaterialsrevision"),
            custpage_subsidiary_display_name: recordObj.getText("subsidiary"),
            // custpage_location_display_name: recordObj.getText("location"),
            // custpage_location: recordObj.getValue("location"),
            custpage_internalid: recordId,
            subdataObj: subdataObj
        }

        return defaultValues;
    }

    /**
     * 获取单位转化率
     */
    const doGetUnitTransferRateList = () => {
        const searchFields = [
            { id: "isinactive", label: "非活动", filter: { values: "F" } },
            { id: "custrecord_chefman_wo_unit", label: "工单单位" },
            { id: "custrecord_chefman_in_units", label: "库存单位" },
            { id: "custrecord_chefman_transfer_rate", label: "转化率" },
        ]
        const resultDataList = bsworks.search.getSearchAllResultDataList("customrecord_chefman_transfer_rate", searchFields, 1, 1000);
        return resultDataList;
    }


    /**
    * 创建库存转移单
    * @param {*} data 
    */
    const doCreateInventoryTransfer = (data) => {
        log.debug("data", data)
        const recordObj = record.create({ type: 'inventorytransfer', isDynamic: true, });
        recordObj.setValue({ fieldId: 'subsidiary', value: data.subsidiary });
        recordObj.setValue({ fieldId: 'location', value: data.location });
        recordObj.setValue({ fieldId: 'transferlocation', value: data.transferlocation });

        recordObj.setValue({ fieldId: "custbody_chefman_wo_no", value: data.internalid });
        recordObj.setValue({ fieldId: "custbody_chefman_assembly", value: data.custbody_chefman_assembly });
        recordObj.setValue({ fieldId: "custbody_chefman_bom", value: data.custbody_chefman_bom });
        recordObj.setValue({ fieldId: "custbody_chefman_bom_rev", value: data.custbody_chefman_bom_rev });
        recordObj.setValue({ fieldId: "custbody_csm_picking_set", value: data.picking_todo });
        recordObj.setValue({ fieldId: 'memo', value: data.memo });

        const workorderItemList = []; //需要反填已工单货品已领料数量字段值的记录
        data.subdataList.forEach(subdata => {
            recordObj.selectNewLine({ sublistId: "inventory" });
            recordObj.setCurrentSublistValue({ sublistId: "inventory", fieldId: 'item', value: subdata.item });
            recordObj.setCurrentSublistValue({ sublistId: "inventory", fieldId: 'units', value: subdata.units });
            recordObj.setCurrentSublistValue({ sublistId: "inventory", fieldId: 'adjustqtyby', value: subdata.quantity });
            const sourcedocFlag = "workorder#" + data.internalid + "#" + (parseFloat(data.picking_todo) || 0) + "#" + subdata.line;
            recordObj.setCurrentSublistValue({ sublistId: "inventory", fieldId: "custcol_chefman_sourcedoc_flag", value: sourcedocFlag });

            //库存详情
            const inventoryDetail = recordObj.getCurrentSublistSubrecord({ sublistId: "inventory", fieldId: "inventorydetail" });
            inventoryDetail.selectNewLine({ sublistId: "inventoryassignment" });
            inventoryDetail.setCurrentSublistValue({
                sublistId: "inventoryassignment",
                fieldId: "binnumber",
                value: "1",
            });
            inventoryDetail.setCurrentSublistValue({
                sublistId: "inventoryassignment",
                fieldId: "quantity",
                value: subdata.quantity,
            });
            inventoryDetail.commitLine({ sublistId: 'inventoryassignment' });
            recordObj.commitLine({ sublistId: "inventory" });

            //已领料数量
            const custcol_workshop_stock_qty = parseFloat(subdata.quantity) + (parseFloat(subdata.custcol_workshop_stock_qty) || 0);
            workorderItemList.push({ line: subdata.line, custcol_workshop_stock_qty: custcol_workshop_stock_qty });
        })
        const internalid = recordObj.save();

        //处理需要反填工单数量字段值的记录
        const workorderRecord = record.load({ type: "workorder", id: data.internalid, });
        if ((parseFloat(data.custbody_csm_picking_set) || 0) > 0) {
            workorderRecord.setValue({ fieldId: 'custbody_csm_picking_set', value: data.custbody_csm_picking_set });
        }
        const lineCount = workorderRecord.getLineCount({ sublistId: "item" });
        for (let i = 0; i < lineCount; i++) {
            const line = workorderRecord.getSublistValue({ sublistId: "item", fieldId: "line", line: i });
            for (let p = 0; p < workorderItemList.length; p++) {
                const workorderItem = workorderItemList[p];
                if (line == workorderItem.line) {
                    workorderRecord.setSublistValue({
                        sublistId: "item",
                        fieldId: "custcol_workshop_stock_qty",
                        value: workorderItem.custcol_workshop_stock_qty,
                        line: i
                    });
                    break;
                }
            }
        }
        workorderRecord.save();


        return bsworks.https.getSuccessResponse(null, { internalid: internalid });
    }

    const onRequest = (context) => {
        //参数值
        var requestBody = context.request.body;
        if (!bsworks.isNullOrEmpty(requestBody)) {
            let responseObject = bsworks.https.getSuccessResponse();
            try {
                requestBody = JSON.parse(requestBody);
                log.debug("requestBody", requestBody)
                if (requestBody.type == "doCreateInventoryTransfer") {
                    responseObject = doCreateInventoryTransfer(requestBody.data);
                }
            } catch (e) {
                log.debug("onRequest", e);
                responseObject.status = "fail";
                responseObject.message = e.message;
            }
            context.response.write(JSON.stringify(responseObject));
        } else {
            renderPage(context);
        }
    }


    return {
        onRequest
    }

});