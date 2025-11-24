/**
 * 供应商对账平台 sl脚本
 * @NApiVersion 2.0
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

define(["../../Util/bsworksUtil.min", "../../Util/suiteletUtil.min", "N/search", "N/record", "N/task"], function (bsworksUtil, suiteletUtil, search, record, task) {


    function renderPage(context) {


        /**
         * suitelet 定时器脚本
         * 
            var intervalCount = 0;
            var startTime = util.nanoTime();
            while (true) {

                if (intervalCount > 10) {
                    break;
                }
                var intervalTime = (util.nanoTime() - startTime) / 1000000000;
                if (intervalTime > 2) {
                    intervalCount++;
                    log.debug("intervalCount", { intervalCount: intervalCount, intervalTime: intervalTime })
                    startTime = util.nanoTime();
                    continue;
                }
            }
         * 
         */


        //参数默认值
        var defaultValues = {
            custpage_currency: 7,
            custpage_subsidiary: 25,
            // custpage_filter_start_date: bsworksUtil.substractYearhDate(1),
            // custpage_filter_end_date: bsworksUtil.substractYearhDate(0)
        };
        var params = suiteletUtil.doGetRequestParamters(context.request.parameters, defaultValues);
        defaultValues = handleDefaultValues(params.defaultValues);
        // log.debug("defaultValues", defaultValues);
        var title = "供应商对账平台";
        //当前suitelet脚本部署名称
        var suiteletScriptName = "bsw_plat_vendorbill_sl";
        var form = suiteletUtil.doCreateForm(title, "/SuiteScripts/bsworks/View/Plat/plat_vendorbill_cs.js", false);

        form.addSubmitButton({
            // id: "custpage_submit_button",
            label: "提交开票",
        });
        // form.addButton({
        //     id: "custpage_cancel_button",
        //     label: "取消",
        // });

        //送货单号
        var deliverNoList = getDeliverNoDataList();
        // log.debug("deliverNoList", deliverNoList);
        var filtersConfig = {
            id: "custpage_fieldgroup_filter", label: "过滤器", suiteletScriptName: suiteletScriptName,
            fields: [
                { id: "custpage_vendor", label: "供应商", type: "select", source: "vendor", required: true },
                { id: "custpage_subsidiary", label: "子公司", type: "select", source: "subsidiary", required: true },
                { id: "custpage_filter_start_date", label: "开始日期", type: "date" },
                { id: "custpage_filter_end_date", label: "结束日期", type: "date" },
                { id: "custpage_currency", label: "币别", type: "select", source: "currency" },
                { id: "custpage_status", label: "对账状态", type: "select", selectOPtions: [{ value: "1", text: "锁单", isSelected: true }, { value: "2", text: "变更" }], showEmptyItem: false, required: true },
                { id: "custpage_ponumber", label: "采购单号", type: "multiselect", source: "purchaseorder" },
                { id: "custpage_hc_deliver_no", label: "送货单号", type: "multiselect", selectOPtions: deliverNoList },
            ],
        }

        suiteletUtil.doCreateFilter(form, filtersConfig, defaultValues);

        //开票信息
        var billGroupConfig = {
            id: "billform", label: "开票信息",
            fields: [
                { id: "custpage_vendorbill_tranid", label: "账单参考编号", type: "text" },
                { id: "custpage_order_type", label: "订单类型", type: "select", selectOPtions: [{ value: "", text: "" }, { value: "1", text: "外协采购订单" }, { value: "2", text: "材料采购订单" }, { value: "3", text: "费用结算订单" }, { value: "4", text: "部品采购订单" }], showEmptyItem: false }
            ],
        };
        suiteletUtil.doCreateFormGroup(form, billGroupConfig, {});

        //子列表字段
        var sublistFields = [
            { id: "mainname", label: "供应商", type: "select", source: "vendor" },
            { id: "trandate", label: "送货日期" },
            { id: "tranid", label: "入库编号" },
            { id: "custbody_hc_deliver_no", label: "送货单号" },
            { id: "createdfrom", label: "采购单号", type: "select", source: "purchaseorder" },
            // { id: "subsidiary", label: "子公司", type: "select", source: "subsidiary" },
            { id: "item", label: "物料编码", type: "select", source: "item" },
            { id: "displayname", label: "品名" },
            { id: "custitem_hc_item_size", label: "规格" },
            { id: "currency", label: "货币", type: "select", source: "currency" },
            { id: "quantity", label: "数量", type: "float" },
            { id: "custcol_ir_bill_qty", label: "已开票数量", type: "float", },
            { id: "quantitybilling", label: "应开票数量", type: "float", displayType: defaultValues["custpage_status"] == "1" ? "inline" : "entry" },
            { id: "fxrate", label: "未税单价", type: "float" },
            { id: "taxcode_rate", label: "税率" },
            { id: "taxrate", label: "含税单价", type: "float" },
            { id: "fxamount", label: "应付款", type: "currency", displayType: "disabled" },
            { id: "statusref_display_name", label: "状态" },
            { id: "internalid", label: "入库单id", displayType: "hidden" },
            { id: "line", label: "货品行号", type: "float", displayType: "hidden" },
            { id: "taxcode", label: "税码", displayType: "hidden" },
            { id: "unitid", label: "单位", displayType: "hidden" },
            { id: "department", label: "部门", displayType: "hidden" },
            { id: "subsidiary", label: "子公司", displayType: "hidden" },
            { id: "mainname_display_name", label: "供应商名称", displayType: "hidden" },
            { id: "createdfrom_display_name", label: "采购订单名称", displayType: "hidden" },
            { id: "currency_display_name", label: "货币名称", displayType: "hidden" },
            { id: "item_display_name", label: "货品名称", displayType: "hidden" },
            { id: "lineuniquekey", label: "货品行唯一键", displayType: "hidden" },
        ];


        //重置样式
        var customPageScript = "jQuery('.uir-page-title .uir-record-type').attr('style','height:50px;line-height:50px;');";
        customPageScript += "document.getElementById('tbl_submitter').parentElement.parentElement.parentElement.parentElement.style='margin-bottom:10px;';";

        //创建子列表
        var sublistConfig = {
            title: title, label: "货品收据页",
            hasCheckbox: true,
            hasLineChanged: false,
            suiteletScriptName: suiteletScriptName,
            customPageScript: customPageScript,
            formFieldGroups: [
                { id: "custpage_fieldgroup_filter", colNum: 4, lastColRight: true, collapse: true },
                { id: "custpage_fieldgroup_billform", colNum: 4, lastColRight: true },
            ],
            buttons: [],
            sublistFields: sublistFields,
            // summaryContent: "总金额=勾选行的∑(未税单价*(1+税率)*应开票数量)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;总税额=勾选行的∑(未税单价*税率)*应开票数量"
        };
        var sublistObj = suiteletUtil.doCreateSublist(form, sublistConfig);
        sublistObj.addMarkAllButtons();
        //查询明细列表数据
        var subDataList = [];
        if (!params.pageInit) {
            subDataList = doSearchSublistDataList("customsearch_vendor_bill_recon", sublistFields, defaultValues);
            //根据送货单号过滤数据
            subDataList = doFilterSublistDataList(subDataList, defaultValues);
            suiteletUtil.doSetSublistValues(sublistObj, subDataList);
            // log.debug("doSearchSublistDataList", subDataList)
        }
        suiteletUtil.doSetSessionSuiteletConfig(filtersConfig, sublistConfig);

        context.response.writePage(form);
    }

    function doFilterSublistDataList(subDataList, defaultValues) {
        var custpage_hc_deliver_no = defaultValues.custpage_hc_deliver_no;
        if (bsworksUtil.isNullOrEmpty(custpage_hc_deliver_no)) {
            return subDataList;
        }
        if (custpage_hc_deliver_no.length <= 1 && custpage_hc_deliver_no[0] == "") {
            return subDataList;
        }
        var resultDataList = [];
        for (var i = 0; i < subDataList.length; i++) {
            var subdata = subDataList[i];
            if (!bsworksUtil.isNullOrEmpty(subdata.custbody_hc_deliver_no)
                && custpage_hc_deliver_no.indexOf(subdata.custbody_hc_deliver_no) != -1) {
                resultDataList.push(subdata);
            }
        }
        return resultDataList;
    }

    /**
     * 查询明细列表数据
     * @param {*} sublistFields 
     * @param {*} pageIndex 
     * @param {*} pageSize 
     * @returns 
     */
    function doSearchSublistDataList(recordType, sublistFields, defaultValues) {
        var sublistDataList = [];
        var searchObj = search.load({ id: recordType });
        var searchColumns = searchObj.columns;

        if (!hasColumnName(searchColumns, "custbody_hc_deliver_no")) {
            searchColumns.push({ name: "custbody_hc_deliver_no" });
        }
        if (!hasColumnName(searchColumns, "custcol_ir_bill_qty")) {
            searchColumns.push({ name: "custcol_ir_bill_qty" });
        }
        if (!hasColumnName(searchColumns, "department")) {
            searchColumns.push({ name: "department" });
        }
        if (!hasColumnName(searchColumns, "unitid")) {
            searchColumns.push({ name: "unitid" });
        }
        if (!hasColumnName(searchColumns, "internalid")) {
            searchColumns.push({ name: "internalid" });
        }
        if (!hasColumnName(searchColumns, "lineuniquekey")) {
            searchColumns.push({ name: "lineuniquekey" });
        }

        searchObj.columns = searchColumns;

        var searchFilters = searchObj.filters;

        var vendorFilter = getSearchFilter(searchColumns, "entity", defaultValues["custpage_vendor"]);
        if (null != vendorFilter) {
            vendorFilter.operator = "is";
            searchFilters.push(vendorFilter);
        }
        var subsidiaryFilter = getSearchFilter(searchColumns, "subsidiary", defaultValues["custpage_subsidiary"]);
        if (null != subsidiaryFilter) {
            subsidiaryFilter.operator = "is";
            searchFilters.push(subsidiaryFilter);
        }
        var trandateFilter = getSearchFilter(searchColumns, "trandate", defaultValues["custpage_filter_date"]);
        if (null != trandateFilter) {
            trandateFilter.operator = "within";
            searchFilters.push(trandateFilter);
        }
        var currencyFilter = getSearchFilter(searchColumns, "currency", defaultValues["custpage_currency"]);
        if (null != currencyFilter) {
            currencyFilter.operator = "is";
            searchFilters.push(currencyFilter);
        }


        var ponumberValues = defaultValues["custpage_ponumber"];
        if (null != ponumberValues
            && ponumberValues.length <= 1 && ponumberValues[0] == "") {
            ponumberValues = null;
        }
        var ponumberFilter = getSearchFilter(searchColumns, "createdfrom", ponumberValues);
        if (null != ponumberFilter) {
            ponumberFilter.operator = "anyof";
            searchFilters.push(ponumberFilter);
        }

        searchObj.filters = searchFilters;

        // log.debug("filters", searchFilters);

        var searchResult = searchObj.run().getRange({ start: 0, end: 1000 });
        if (searchResult.length == 0) return searchResult;
        // log.debug("searchResult", searchResult.length);
        for (var index = 0; index < searchResult.length; index++) {
            var searchIndex = searchResult[index];
            var resultData = { sublist_line_num: (index + 1) + "", sublist_line_changed: "F" };
            for (var i = 0; i < searchColumns.length; i++) {
                var column = searchColumns[i];
                var dataKey = column.name;
                resultData[dataKey] = searchIndex.getValue(column);
                if (["mainname", "createdfrom", "currency", "item", "statusref"].indexOf(dataKey) != -1) {
                    resultData[dataKey + "_display_name"] = searchIndex.getText(column);
                }
            }
            sublistDataList.push(resultData);
        }
        // log.debug("sublistDataList", sublistDataList);

        var itemreceiptIds = [];
        var purchaseIds = [];
        var purchaseItems = [];
        for (var i = 0; i < sublistDataList.length; i++) {
            var subdata = sublistDataList[i];
            itemreceiptIds.push(subdata.internalid);
            purchaseIds.push(subdata.createdfrom);
            purchaseItems.push(subdata.item);
        }

        //货品收据关联采购订单数据
        var itemreceiptApplyList = getItemreceiptApplyList(itemreceiptIds, purchaseItems);
        //获取税率
        var taxObj = getVendorSubsidiaryTax(defaultValues["custpage_vendor"], defaultValues["custpage_subsidiary"]);
        // log.debug("taxObj", parseFloat(taxObj.taxitem_display_name))
        //获取采购订单货品行不含税单价和行号
        var purchaseItemList = getPurchaseItemDataList(purchaseIds, purchaseItems);
        var newSubdataList = [];
        for (var i = 0; i < sublistDataList.length; i++) {
            var subdata = sublistDataList[i];

            //计算应开票数量
            var quantity = subdata.quantity;
            var custcol_ir_bill_qty = parseFloat(subdata.custcol_ir_bill_qty) || 0;
            var quantitybilling = (parseFloat(quantity) || 0) - custcol_ir_bill_qty;
            quantitybilling = parseFloat(quantitybilling).toFixed(2);
            if (parseFloat(quantitybilling) <= 0) {
                continue;
            }

            //计算含税单价=未税单价*（1+税率），保留3位小数
            var purchaseItem = getPurchaseItem(subdata, purchaseItemList, itemreceiptApplyList);
            var fxrate = parseFloat(purchaseItem.fxrate) || 0;
            var taxitem_display_name = taxObj.taxitem_display_name;
            taxitem_display_name = taxitem_display_name.replace(/[^\d]/g, '');
            var taxcode_rate = parseFloat(taxitem_display_name) || 0;
            var taxrate = fxrate * (1 + taxcode_rate / 100);
            taxrate = taxrate.toFixed(3);

            //计算应付款
            // var fxamount = parseFloat(quantitybilling) * parseFloat(taxrate);
            var fxamount = parseFloat(quantitybilling) * fxrate * (1 + taxcode_rate / 100);
            fxamount = fxamount.toFixed(2);


            subdata.custcol_ir_bill_qty = custcol_ir_bill_qty;
            subdata.quantitybilling = quantitybilling;
            subdata.fxrate = fxrate;
            subdata.taxcode = taxObj.taxitem;
            subdata.taxcode_rate = taxcode_rate + "%";
            subdata.taxrate = taxrate;
            subdata.fxamount = fxamount;
            subdata.line = purchaseItem.line;
            newSubdataList.push(subdata);
        }
        return newSubdataList;
    }


    function getItemreceiptApplyList(itemreceiptids, items) {
        var searchFields = [
            { id: "mainline", displayType: "none", search: { type: "none" }, filter: { values: "F" } },
            { id: "internalid", filter: { operator: "anyof", values: itemreceiptids } },
            { id: "item", filter: { operator: "anyof", values: items } },
            { id: "lineuniquekey" },
            { id: 'line', asias: "orderline", join: "appliedtotransaction" },
            { id: 'internalid', asias: "orderdoc", join: "appliedtotransaction" }

        ];
        var searchList = [];
        for (var p = 1; p < 50; p++) {
            var searchDataList = bsworksUtil.getSearchResultDataList("itemreceipt", searchFields, p, 1000);
            searchList = searchList.concat(searchDataList);
            if (searchDataList.length < 1000) {
                break;
            }
        }
        return searchList;
    }



    /**
        * 查询采购订单货品
        * @param {*} subdata 
        * @param {*} itemDataList 
        * @param {*} itemreceiptApplyList 
        */
    function getPurchaseItem(subdata, itemDataList, itemreceiptApplyList) {
        for (var i = 0; i < itemreceiptApplyList.length; i++) {
            var applyData = itemreceiptApplyList[i];
            if (subdata.internalid == applyData.internalid && subdata.item == applyData.item
                && subdata.lineuniquekey == applyData.lineuniquekey && subdata.createdfrom == applyData.orderdoc) {
                subdata.orderline = applyData.orderline;
                break;
            }
        }

        var itemObj = { fxrate: 0, line: 0 };
        for (var i = 0; i < itemDataList.length; i++) {
            var itemData = itemDataList[i];
            if (itemData.internalid == subdata.createdfrom && itemData.item == subdata.item
                && itemData.line == subdata.orderline) {
                itemObj = itemData;
                break;
            }
        }
        return itemObj;
    }



    /**
     * 查询采购订单货品行数据列表
     * @param {*} purchaseIds 
     * @param {*} items 
     */
    function getPurchaseItemDataList(purchaseIds, items) {
        var resultDataList = [];
        var searchObj = search.load({ id: "customsearch_bill_verify_price" });
        var searchColumns = searchObj.columns;
        if (!hasColumnName(searchColumns, "line")) {
            searchColumns.push({ name: "line" });
        }
        searchObj.columns = searchColumns;

        var searchFilters = searchObj.filters;
        var internalidFilter = getSearchFilter(searchColumns, "internalid", purchaseIds);
        if (null != internalidFilter) {
            internalidFilter.operator = "anyof";
            searchFilters.push(internalidFilter);
        }

        var itemFilter = getSearchFilter(searchColumns, "item", items);
        if (null != itemFilter) {
            itemFilter.operator = "anyof";
            searchFilters.push(itemFilter);
        }

        searchObj.filters = searchFilters;
        var searchResult = searchObj.run().getRange({ start: 0, end: 1000 });
        if (searchResult.length == 0) return resultDataList;
        for (var index = 0; index < searchResult.length; index++) {
            var searchIndex = searchResult[index];
            var resultData = {};
            for (var i = 0; i < searchColumns.length; i++) {
                var column = searchColumns[i];
                resultData[column.name] = searchIndex.getValue(column);
            }
            resultDataList.push(resultData);
        }
        return resultDataList;
    }



    function getSearchFilter(columns, fieldId, fieldValue) {
        if (bsworksUtil.isNullOrEmpty(fieldValue)) return null;
        var filter = {};
        for (var i = 0; i < columns.length; i++) {
            var column = columns[i];
            if (column.name == fieldId) {
                if (null != column.join) {
                    filter.join = column.join;
                }
                break;
            }
        }
        filter.name = fieldId;
        filter.values = fieldValue;
        return filter;
    }

    /**
     * 获取供应商关联子公司对应的税码
     * @param {*} vendorId 
     */
    function getVendorSubsidiaryTax(vendorId, subsidiaryId) {
        var searchFields = [
            { id: "entity", filter: { values: vendorId } },
            { id: "subsidiary", filter: { values: subsidiaryId } },
            { id: "taxitem", type: "select", search: { type: "valueText" } },

        ];
        var searchDataList = bsworksUtil.getSearchResultDataList("vendorsubsidiaryrelationship", searchFields, 1, 1000);
        if (null == searchDataList || searchDataList.length == 0) {
            return { taxitem: "", taxitem_display_name: "0%" };
        }
        // log.debug("getVendorSubsidiaryTax", searchDataList);
        return searchDataList[0];
    }

    function getDeliverNoDataList() {
        var searchFields = [
            { id: "mainline", displayType: "none", search: { type: "none" }, filter: { values: "T" } },
            { id: "custbody_hc_deliver_no", search: { summary: "group" } }
        ];

        var searchList = [];
        for (var p = 1; p < 50; p++) {
            var searchDataList = bsworksUtil.getSearchResultDataList("itemreceipt", searchFields, p, 1000);
            searchList = searchList.concat(searchDataList);
            if (searchDataList.length < 1000) {
                break;
            }
        }
        var deliverNoOPtions = [];
        for (var i = 0; i < searchList.length; i++) {
            var searchData = searchList[i];
            if (bsworksUtil.isNullOrEmpty(searchData.custbody_hc_deliver_no)) continue;
            deliverNoOPtions.push({ value: searchData.custbody_hc_deliver_no, text: searchData.custbody_hc_deliver_no });
        }
        return deliverNoOPtions;
    }

    function hasColumnName(columns, name, join) {
        var hasColumnName = false;
        for (var i = 0; i < columns.length; i++) {
            if (name == columns[i].name && columns.join == join) {
                hasColumnName = true;
                break;
            }
        }
        return hasColumnName;
    }


    /**
     * 默认值处理
     * @param {*} defaultValues 
     * @returns 
     */
    function handleDefaultValues(defaultValues, pageInit) {
        return defaultValues;
    }

    function validTranid(tranid) {
        var validResult = true;
        var searchFields = [
            { id: "mainline", displayType: "none", search: { type: "none" }, filter: { values: "T" } },
            { id: "tranid", filter: { operator: "haskeywords", values: tranid } },
        ];
        var searchDataList = bsworksUtil.getSearchResultDataList("vendorbill", searchFields, 1, 100);
        for (var i = 0; i < searchDataList.length; i++) {
            var searchData = searchDataList[i];
            if (searchData.tranid == tranid) {
                validResult = false;
                break;
            }
        }
        return validResult;
    }


    /**
        * 根据多组采购订单生成采购发票
        * @param {*} podataList 
        */
    function doCreateVendorBill(maindata, podataList) {
        try {
            //判断tranid是否唯一
            if (!validTranid(maindata.tranid)) {
                return bsworksUtil.getFailResponse("账单参考编号已存在，请重新输入！");
            }

            //相同采购订单号和行号，根据数量合并
            var newPodataList = [];
            var itemreceiptObj = {}; //需要反填已开票数量字段值的记录
            for (var i = 0; i < podataList.length; i++) {
                var subdata = podataList[i];
                //已开票数量
                var custcol_ir_bill_qty = parseFloat(subdata.quantitybilling) + (parseFloat(subdata.custcol_ir_bill_qty) || 0);
                var itemreceiptItem = { line: subdata.line, custcol_ir_bill_qty: custcol_ir_bill_qty };
                if (itemreceiptObj[subdata.itemreceiptId] == null) {
                    itemreceiptObj[subdata.itemreceiptId] = [itemreceiptItem];
                } else {
                    itemreceiptObj[subdata.itemreceiptId].push(itemreceiptItem);
                }

                var hasdata = false;
                for (var n = 0; n < newPodataList.length; n++) {
                    var podata = newPodataList[n];
                    if (subdata.purchaseId == podata.purchaseId && subdata.line == podata.line) {
                        podata.quantitybilling = parseFloat(podata.quantitybilling) + parseFloat(subdata.quantitybilling);
                        podata.sourcedocFlag = podata.sourcedocFlag + "###" + subdata.itemreceiptId + "#" + subdata.quantitybilling + "#" + subdata.line;
                        hasdata = true;
                        break;
                    }
                }
                if (!hasdata) {
                    subdata.sourcedocFlag = "itemreceipt#" + subdata.itemreceiptId + "#" + subdata.quantitybilling + "#" + subdata.line;
                    newPodataList.push(subdata);
                }
            }

            var podata0 = podataList[0];
            var billRecord = record.create({
                type: 'vendorbill',
                isDynamic: true,
                defaultValues: { entity: podata0.vendor }
            });
            // log.debug("tranid", tranid);进行字段赋值
            billRecord.setValue({ fieldId: 'subsidiary', value: podata0.subsidiary });
            billRecord.setValue({ fieldId: 'currency', value: podata0.currency });
            billRecord.setValue({ fieldId: 'department', value: podata0.department });
            billRecord.setValue({ fieldId: 'account', value: "111" });
            billRecord.setValue({ fieldId: 'approvalstatus', value: "1" });
            billRecord.setValue({ fieldId: 'tranid', value: maindata.tranid });
            billRecord.setValue({ fieldId: 'custbody_hc_po_type', value: maindata.ordertype });

            for (var i = 0; i < newPodataList.length; i++) {
                var subdata = newPodataList[i];
                billRecord.selectNewLine({ sublistId: "item" });
                billRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "item", value: subdata.item });
                billRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "quantity", value: subdata.quantitybilling });
                billRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "rate", value: subdata.rate });
                billRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "unit", value: subdata.unit });
                billRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "taxcode", value: subdata.taxcode });
                billRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "department", value: subdata.department });
                billRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_chefman_rateincludetax", value: subdata.taxrate });

                billRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "orderdoc", value: subdata.purchaseId });
                billRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "orderline", value: subdata.line });
                billRecord.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_chefman_sourcedoc_flag", value: subdata.sourcedocFlag });
                billRecord.commitLine({ sublistId: "item" });


            }
            var billId = billRecord.save();

            //处理需要反填已开票数量字段值的记录
            if (Object.keys(itemreceiptObj).length > 12) {
                //创建任务
                var reduceParams = { itemreceiptObj: itemreceiptObj };
                var reduceTask = task.create({
                    taskType: task.TaskType.MAP_REDUCE,
                    scriptId: "customscript_bsw_plat_vendorbill_mr",
                    deploymentId: "customdeploy_bsw_plat_vendorbill_mr",
                    params: { custscript_bsw_plat_vendorbill_params: reduceParams }
                });
                var taskId = reduceTask.submit();
                return bsworksUtil.getSuccessResponse("操作成功", { billId: billId, taskId: taskId });
            } else {
                for (var key in itemreceiptObj) {
                    var itemreceiptRecord = record.load({ type: "itemreceipt", id: key });
                    var itemreceiptitemList = itemreceiptObj[key];
                    var numLines = itemreceiptRecord.getLineCount({ sublistId: "item" });
                    for (var i = 0; i < numLines; i++) {
                        var line = itemreceiptRecord.getSublistValue({ sublistId: "item", fieldId: "orderline", line: i });
                        for (var p = 0; p < itemreceiptitemList.length; p++) {
                            var itemreceiptitem = itemreceiptitemList[p];
                            if (line == itemreceiptitem.line) {
                                itemreceiptRecord.setSublistValue({ sublistId: "item", fieldId: "custcol_ir_bill_qty", line: i, value: itemreceiptitem.custcol_ir_bill_qty });
                                break;
                            }
                        }
                    }
                    itemreceiptRecord.save();
                }
            }
            return bsworksUtil.getSuccessResponse("操作成功", { billId: billId });
        } catch (e) {
            log.error("根据多组采购订单生成采购发票", e);
            return bsworksUtil.getFailResponse(e.message);
        }
    }

    function onRequest(context) {
        //参数值
        var requestBody = context.request.body;
        if (!bsworksUtil.isNullOrEmpty(requestBody)) {
            requestBody = JSON.parse(requestBody);
        }
        if (!bsworksUtil.isNullOrEmpty(requestBody.doPostButton)) {
            var responseObject = bsworksUtil.getSuccessResponse();
            if ("doCreateVendorbill" == requestBody.doPostButton) {
                //执行供应商开票
                var maindata = requestBody.maindata;
                var subdataList = requestBody.subdataList;
                responseObject = doCreateVendorBill(maindata, subdataList);
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