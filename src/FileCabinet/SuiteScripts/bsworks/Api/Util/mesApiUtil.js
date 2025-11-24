/**
 * MES接口-工具类
 */

define(["../../plugin/bsworks/bsworksUtil-1.0.min", "N/record", "N/runtime"], (bsworks, record, runtime) => {

    const getMainUrl = () => {
        if (runtime.accountId == "7336086") {
            // return "http://60.191.26.238:9999/ptop-cm/";
            return "http://38.58.96.254:9999/ptop-cm/";
        }
        return "http://122.224.0.194:8085/ptop-cm/";
    }

    /**
     * 调用MES接口并保存记录
     * @param {*} recordObj 
     * @param {*} url 
     * @param {*} params 
     * @param {*} header 
     * @returns 
     */
    const doPostApi = (recordObj, url, params, header,) => {
        log.debug("doPostApi-params", params);
        const responseObj = bsworks.http.postHeader(url, JSON.stringify(params), header);
        log.debug("doPostApi-responseObj", responseObj);
        if (responseObj && responseObj.code == 200) {
            recordObj.setValue({ fieldId: "bsworks_api_sync_status", value: true });
            recordObj.setValue({ fieldId: "custbody_chefman_mes_pushstatus", value: true });
            recordObj.save({ ignoreMandatoryFields: true });
            return bsworks.https.getSuccessResponse(null, responseObj);

        } else {
            return bsworks.https.getFailResponse(responseObj.msg, responseObj);
        }
    }


    const getHeaderToken = () => {
        const url = getMainUrl() + "api/login/login?user_cd=system&pwd=sys123456";
        let headerToken = null;
        try {
            const responseObj = bsworks.http.post(url, {});
            if (responseObj && responseObj.data && responseObj.data.token) {
                headerToken = { access_token: responseObj.data.token };
            }
        } catch (e) {
            log.error("getHeaderToken", e);
        }

        return headerToken;
    }

    /**
     * 推送采购订单
     */
    const pushPurchaseOrder = (recordObj) => {
        const header = getHeaderToken();
        if (null == header) {
            return bsworks.https.getFailResponse("token获取失败");
        }
        try {

            //判断是否外协采购订单
            let iswxpo = false;
            const customform = recordObj.getValue("customform");
            if (customform == "205" || customform == "-9896") {
                iswxpo = true;
            }

            const lineCount = recordObj.getLineCount({ sublistId: "item" });
            let totalQuantity = 0; //总数量
            let totalAmount = 0; //总金额
            const subdataList = [];
            for (let line = 0; line < lineCount; line++) {
                //单价
                const rate = recordObj.getSublistValue({ sublistId: "item", fieldId: "rate", line: line }) || 0;
                //含税单价
                const rateincludetax = recordObj.getSublistValue({ sublistId: "item", fieldId: "custcol_chefman_rateincludetax", line: line }) || 0;
                //数量
                const quantity = recordObj.getSublistValue({ sublistId: "item", fieldId: "quantity", line: line }) || 0;
                //金额
                const amount = recordObj.getSublistValue({ sublistId: "item", fieldId: "amount", line: line }) || 0;
                //含税金额
                const grossamt = recordObj.getSublistValue({ sublistId: "item", fieldId: "grossamt", line: line }) || 0;
                //C0SCQ50DY01AQ 插件板(CQ50电源板组件(Power Assy))
                const itemname = recordObj.getSublistText({ sublistId: "item", fieldId: "item", line: line });
                const itemnameSplit = itemname.split(" ");
                let hc_item_name = recordObj.getSublistValue({ sublistId: "item", fieldId: "custcol_hc_item_name", line: line });
                if (!hc_item_name) {
                    if (itemnameSplit.length > 1) {
                        hc_item_name = itemnameSplit[1];
                    } else {
                        hc_item_name = itemname;
                    }
                }
                //备注
                let n_Vnote = recordObj.getSublistValue({ sublistId: "item", fieldId: "description", line: line });
                if (!n_Vnote) {
                    n_Vnote = "";
                }
                const subdata = {
                    //行号
                    "i_Crowno": recordObj.getSublistValue({ sublistId: "item", fieldId: "line", line: line }),
                    //物料号
                    "n_MatNo": itemnameSplit[0],
                    //存货编码
                    "n_StockCode": recordObj.getSublistValue({ sublistId: "item", fieldId: "item", line: line }),
                    //存货名称
                    "n_StockName": hc_item_name,
                    //存货规格
                    "n_StockFormat": recordObj.getSublistValue({ sublistId: "item", fieldId: "custcol_hc_item_size", line: line }),
                    //存货型号
                    "n_StockModel": recordObj.getSublistValue({ sublistId: "item", fieldId: "custcol_hc_item_size", line: line }),
                    //数量
                    "f_Num": quantity + "",
                    //单价
                    "f_Price": (parseFloat(rateincludetax) == 0 ? rate : parseFloat(rateincludetax).toFixed(8)) + "",
                    //金额
                    "f_Amount": (parseFloat(grossamt) == 0 ? amount : grossamt) + "",
                    //备注
                    "n_Vnote": n_Vnote,
                    //单据编码
                    "ns_BillCode": recordObj.getValue("tranid"),
                    //子表主键
                    "ns_Order_bid": recordObj.getSublistValue({ sublistId: "item", fieldId: "lineuniquekey", line: line }),
                    //交货日期
                    // "n_Vdef1": recordObj.getSublistText({ sublistId: "item", fieldId: "expectedreceiptdate", line: line }),
                    "n_Vdef1": recordObj.getSublistText({ sublistId: "item", fieldId: "custcol_pre_receive_date", line: line }),
                    //品牌
                    "n_Vdef3": recordObj.getSublistText({ sublistId: "item", fieldId: "cseg_chefman_brand", line: line }),
                }
                //外协采购订单
                if (iswxpo) {
                    const assembly = recordObj.getSublistValue({ sublistId: "item", fieldId: "assembly", line: line });
                    const itemObj = record.load({ type: "assemblyitem", id: assembly });
                    subdata.n_MatNo = itemObj.getValue("itemid");
                    subdata.n_StockCode = assembly;
                    subdata.n_StockName = itemObj.getValue("displayname");
                    subdata.n_StockFormat = itemObj.getValue("custitem_hc_item_size");
                    subdata.n_StockModel = itemObj.getValue("custitem_hc_item_size");

                    /** 
                    //数量=采购数量-收货数量
                    const quantityreceived = recordObj.getSublistValue({ sublistId: "item", fieldId: "quantityreceived", line: line });
                    subdata.f_Num = (parseFloat(subdata.f_Num || 0) - parseFloat(quantityreceived || 0)).toFixed(2) + "";
                    //金额=数量*单价
                    subdata.f_Amount = (parseFloat(subdata.f_Num || 0) * parseFloat(subdata.f_Price || 0)).toFixed(2) + "";
                    */
                    //工单编码
                    const createdoutsourcedwokey = recordObj.getSublistValue({ sublistId: "item", fieldId: "createdoutsourcedwokey", line: line });
                    subdata.n_WorkOrderCode = createdoutsourcedwokey;
                    /** 
                    let n_WorkOrderCode = "";
                    if (null != createdoutsourcedwokey && "" != createdoutsourcedwokey) {
                        const workorderRecord = record.load({ type: "workorder", id: createdoutsourcedwokey });
                        n_WorkOrderCode = workorderRecord.getValue("tranid");
                    }
                    subdata.n_WorkOrderCode = n_WorkOrderCode;
                    */
                }
                totalQuantity = parseFloat(totalQuantity) + parseFloat(subdata.f_Num || 0);
                totalAmount = parseFloat(totalAmount) + parseFloat(subdata.f_Amount || 0);
                subdataList.push(subdata);
            }
            const params = {
                //单据编号
                "ns_BillCode": recordObj.getValue("tranid"),
                //单据日期
                "n_BillDate": recordObj.getText("trandate"),
                //单据状态	1审核，0自由
                "n_BillStatus": recordObj.getValue("custbody_chefman_hp_approvalstatus") == "2" ? "1" : "0",
                //供应商编码
                "n_CusCode": recordObj.getValue("entity"),
                //供应商名称
                "n_CusName": recordObj.getText("entity"),
                //采购总数
                "f_Num": totalQuantity + "",
                //采购总价
                "f_ANum": totalAmount + "",
                "n_Vnote": recordObj.getValue("memo"),
                "internalid": recordObj.id,
                "puOrder_b": subdataList
            }
            let url = getMainUrl() + "NsToMes/CreatePo";

            //外协采购订单
            if (iswxpo) {
                url = getMainUrl() + "NsToMes/CreateWPo";
            }
            // try {
            //     console.log("params",params);
            // }catch(e) {

            // }

            return doPostApi(recordObj, url, params, header);
        } catch (e) {
            log.error("pushPurchaseOrder", e);
            return bsworks.https.getFailResponse(e.message);
        }

    }

    /**
     * 推送供应商退货授权
     */
    const pushVendorReturnAuthorization = (recordObj) => {
        const header = getHeaderToken();
        if (null == header) {
            return bsworks.https.getFailResponse("token获取失败");
        }
        try {

            const lineCount = recordObj.getLineCount({ sublistId: "item" });
            let totalQuantity = 0;
            const subdataList = [];
            for (let line = 0; line < lineCount; line++) {
                //单价
                const rate = recordObj.getSublistValue({ sublistId: "item", fieldId: "rate", line: line }) || 0;
                //含税单价
                const rateincludetax = recordObj.getSublistValue({ sublistId: "item", fieldId: "custcol_chefman_rateincludetax", line: line }) || 0;
                //数量
                const quantity = recordObj.getSublistValue({ sublistId: "item", fieldId: "quantity", line: line }) || 0;
                totalQuantity = parseFloat(totalQuantity) + parseFloat(quantity);
                //金额
                const amount = recordObj.getSublistValue({ sublistId: "item", fieldId: "amount", line: line }) || 0;
                //含税金额
                const grossamt = recordObj.getSublistValue({ sublistId: "item", fieldId: "grossamt", line: line }) || 0;

                let n_StockName = recordObj.getSublistValue({ sublistId: "item", fieldId: "custcol_hc_item_name", line: line });
                if (!n_StockName) {
                    n_StockName = recordObj.getSublistText({ sublistId: "item", fieldId: "item", line: line });
                }

                subdataList.push({
                    //行号
                    "i_Crowno": recordObj.getSublistValue({ sublistId: "item", fieldId: "line", line: line }),
                    //物料号
                    "n_MatNo": recordObj.getSublistText({ sublistId: "item", fieldId: "item", line: line }),
                    //存货编码
                    "n_StockCode": recordObj.getSublistValue({ sublistId: "item", fieldId: "item", line: line }),
                    //存货名称
                    "n_StockName": n_StockName,
                    //存货规格
                    "n_StockFormat": recordObj.getSublistValue({ sublistId: "item", fieldId: "custcol_hc_item_size", line: line }),
                    //存货型号
                    "n_StockModel": recordObj.getSublistValue({ sublistId: "item", fieldId: "custcol_hc_item_size", line: line }),
                    //数量
                    "f_Num": quantity + "",
                    //单价
                    "f_Price": (parseFloat(rateincludetax) == 0 ? rate : parseFloat(rateincludetax).toFixed(8)) + "",
                    //金额
                    "f_Amount": (parseFloat(grossamt) == 0 ? amount : grossamt) + "",
                    //备注
                    "n_Vnote": recordObj.getSublistValue({ sublistId: "item", fieldId: "description", line: line }),
                    //单据编码
                    "ns_BillCode": recordObj.getValue("tranid"),
                    //子表主键
                    "ns_Order_bid": recordObj.getSublistValue({ sublistId: "item", fieldId: "lineuniquekey", line: line }),
                    //交货日期
                    // "n_Vdef1": recordObj.getSublistText({ sublistId: "item", fieldId: "expectedreceiptdate", line: line }),
                    "n_Vdef1": recordObj.getSublistText({ sublistId: "item", fieldId: "custcol_pre_receive_date", line: line }),
                    //品牌
                    "n_Vdef3": recordObj.getSublistText({ sublistId: "item", fieldId: "cseg_chefman_brand", line: line })
                });
            }
            const params = {
                //单据编号
                "ns_BillCode": recordObj.getValue("tranid"),
                //单据日期
                "n_BillDate": recordObj.getText("trandate"),
                //单据状态	1审核，0自由
                "n_BillStatus": recordObj.getValue("custbody_chefman_hp_approvalstatus") == "2" ? "1" : "0",
                //供应商编码
                "n_CusCode": recordObj.getValue("entity"),
                //供应商名称
                "n_CusName": recordObj.getText("entity"),
                //采购总数
                "f_Num": totalQuantity + "",
                //采购总价
                "f_ANum": recordObj.getValue("total") || 0,
                "n_Vnote": recordObj.getValue("memo"),
                "internalid": recordObj.id,
                "puOrder_b": subdataList
            }
            try {
                // console.log("params", params)
            } catch (e) {
                log.error("", e);
            }
            const url = getMainUrl() + "NsToMes/CreateRPo";
            return doPostApi(recordObj, url, params, header);
        } catch (e) {
            log.error("pushVendorReturnAuthorization", e);
            return bsworks.https.getFailResponse(e.message);
        }

    }

    /**
     * 推送销售订单
     */
    const pushSalesOrder = (recordObj) => {
        const header = getHeaderToken();
        if (null == header) {
            return bsworks.https.getFailResponse("token获取失败");
        }
        try {

            const lineCount = recordObj.getLineCount({ sublistId: "item" });
            let totalQuantity = 0;
            const subdataList = [];
            for (let line = 0; line < lineCount; line++) {
                //单价
                const rate = recordObj.getSublistValue({ sublistId: "item", fieldId: "rate", line: line }) || 0;
                //含税单价
                const rateincludetax = recordObj.getSublistValue({ sublistId: "item", fieldId: "custcol_chefman_rateincludetax", line: line }) || 0;
                //数量
                const quantity = recordObj.getSublistValue({ sublistId: "item", fieldId: "quantity", line: line }) || 0;
                totalQuantity = parseFloat(totalQuantity) + parseFloat(quantity);
                //金额
                const amount = recordObj.getSublistValue({ sublistId: "item", fieldId: "amount", line: line }) || 0;
                //含税金额
                const grossamt = recordObj.getSublistValue({ sublistId: "item", fieldId: "grossamt", line: line }) || 0;

                let n_StockName = recordObj.getSublistValue({ sublistId: "item", fieldId: "custcol_hc_item_name", line: line });
                if (!n_StockName) {
                    n_StockName = recordObj.getSublistText({ sublistId: "item", fieldId: "item", line: line });
                }

                subdataList.push({
                    //行号
                    "i_Crowno": recordObj.getSublistValue({ sublistId: "item", fieldId: "line", line: line }),
                    //产品料号
                    "n_MatNo": recordObj.getSublistText({ sublistId: "item", fieldId: "item", line: line }),
                    //产品编码
                    "n_StockCode": recordObj.getSublistValue({ sublistId: "item", fieldId: "item", line: line }),
                    //产品名称
                    "n_StockName": n_StockName,
                    //产品规格
                    "n_StockFormat": recordObj.getSublistValue({ sublistId: "item", fieldId: "custcol_hc_item_size", line: line }),
                    //产品型号
                    "n_StockModel": recordObj.getSublistValue({ sublistId: "item", fieldId: "custcol_hc_item_size", line: line }),
                    //数量
                    "f_Num": quantity + "",
                    //计量单位
                    "n_MeasureUnit": recordObj.getSublistText({ sublistId: "item", fieldId: "units", line: line }),
                    //单价
                    "f_Price": (parseFloat(rateincludetax) == 0 ? rate : parseFloat(rateincludetax).toFixed(8)) + "",
                    //金额
                    "f_Amount": (parseFloat(grossamt) == 0 ? amount : grossamt) + "",
                    //交货日期
                    "n_DeliveryDate": recordObj.getSublistText({ sublistId: "item", fieldId: "expectedshipdate", line: line }),
                    //单据编码
                    "ns_BillCode": recordObj.getValue("tranid"),
                    //子表主键
                    "ns_Order_bid": recordObj.getSublistValue({ sublistId: "item", fieldId: "lineuniquekey", line: line }),
                    //采购凭证
                    "n_PurOrder": "",
                    //产品品名	
                    "n_MateDesc": "",
                    //包装标识
                    "n_Package": "",
                    //条码开始
                    "n_BarcS": "",
                    //条码结束
                    "n_BarcE": "",
                    //备注
                    "n_Vnote": recordObj.getSublistValue({ sublistId: "item", fieldId: "description", line: line }),
                });
            }
            const params = {
                //单据编号
                "ns_BillCode": recordObj.getValue("tranid"),
                //单据日期
                "n_BillDate": recordObj.getText("trandate"),
                //单据状态	1审核，0自由
                "n_BillStatus": recordObj.getValue("custbody_chefman_hp_approvalstatus") == "2" ? "1" : "0",
                //供应商编码
                "n_CusCode": recordObj.getValue("entity"),
                //供应商名称
                "n_CusName": recordObj.getText("entity"),
                //收货人
                "n_Receiver": "",
                //收货人电话
                "n_ReceiverCall": "",
                //收货地址
                "n_ReceiverAdd": recordObj.getValue("shipaddress"),
                "n_Vnote": recordObj.getValue("memo"),
                "internalid": recordObj.id,
                "saOrder_b": subdataList
            }
            const url = getMainUrl() + "NsToMes/CreateSa";
            return doPostApi(recordObj, url, params, header);
        } catch (e) {
            log.error("pushSalesOrder", e);
            return bsworks.https.getFailResponse(e.message);
        }

    }

    /**
     * 推送销售退货申请（退货授权）
     */
    const pushReturnAuthorization = (recordObj) => {
        const header = getHeaderToken();
        if (null == header) {
            return bsworks.https.getFailResponse("token获取失败");
        }
        try {

            const lineCount = recordObj.getLineCount({ sublistId: "item" });
            let totalQuantity = 0;
            const subdataList = [];
            for (let line = 0; line < lineCount; line++) {
                //单价
                const rate = recordObj.getSublistValue({ sublistId: "item", fieldId: "rate", line: line }) || 0;
                //含税单价
                const rateincludetax = recordObj.getSublistValue({ sublistId: "item", fieldId: "custcol_chefman_rateincludetax", line: line }) || 0;
                //数量
                const quantity = recordObj.getSublistValue({ sublistId: "item", fieldId: "quantity", line: line }) || 0;
                totalQuantity = parseFloat(totalQuantity) + parseFloat(quantity);
                //金额
                const amount = recordObj.getSublistValue({ sublistId: "item", fieldId: "amount", line: line }) || 0;
                //含税金额
                const grossamt = recordObj.getSublistValue({ sublistId: "item", fieldId: "grossamt", line: line }) || 0;

                let n_StockName = recordObj.getSublistValue({ sublistId: "item", fieldId: "custcol_hc_item_name", line: line });
                if (!n_StockName) {
                    n_StockName = recordObj.getSublistText({ sublistId: "item", fieldId: "item", line: line });
                }

                subdataList.push({
                    //行号
                    "i_Crowno": recordObj.getSublistValue({ sublistId: "item", fieldId: "line", line: line }),
                    //产品料号
                    "n_MatNo": recordObj.getSublistText({ sublistId: "item", fieldId: "item", line: line }),
                    //产品编码
                    "n_StockCode": recordObj.getSublistValue({ sublistId: "item", fieldId: "item", line: line }),
                    //产品名称
                    "n_StockName": n_StockName,
                    //产品规格
                    "n_StockFormat": recordObj.getSublistValue({ sublistId: "item", fieldId: "custcol_hc_item_size", line: line }),
                    //产品型号
                    "n_StockModel": recordObj.getSublistValue({ sublistId: "item", fieldId: "custcol_hc_item_size", line: line }),
                    //数量
                    "f_Num": quantity + "",
                    //计量单位
                    "n_MeasureUnit": recordObj.getSublistText({ sublistId: "item", fieldId: "units", line: line }),
                    //单价
                    "f_Price": (parseFloat(rateincludetax) == 0 ? rate : parseFloat(rateincludetax).toFixed(8)) + "",
                    //金额
                    "f_Amount": (parseFloat(grossamt) == 0 ? amount : grossamt) + "",
                    //交货日期
                    "n_DeliveryDate": recordObj.getSublistText({ sublistId: "item", fieldId: "expectedshipdate", line: line }),
                    //单据编码
                    "ns_BillCode": recordObj.getValue("tranid"),
                    //子表主键
                    "ns_Order_bid": recordObj.getSublistValue({ sublistId: "item", fieldId: "lineuniquekey", line: line }),
                    //采购凭证
                    "n_PurOrder": "",
                    //产品品名	
                    "n_MateDesc": "",
                    //包装标识
                    "n_Package": "",
                    //条码开始
                    "n_BarcS": "",
                    //条码结束
                    "n_BarcE": "",
                    //备注
                    "n_Vnote": recordObj.getSublistValue({ sublistId: "item", fieldId: "description", line: line }),
                });
            }
            const params = {
                //单据编号
                "ns_BillCode": recordObj.getValue("tranid"),
                //单据日期
                "n_BillDate": recordObj.getText("trandate"),
                //单据状态	1审核，0自由
                "n_BillStatus": recordObj.getValue("custbody_chefman_hp_approvalstatus") == "2" ? "1" : "0",
                //供应商编码
                "n_CusCode": recordObj.getValue("entity"),
                //供应商名称
                "n_CusName": recordObj.getText("entity"),
                //收货人
                "n_Receiver": "",
                //收货人电话
                "n_ReceiverCall": "",
                //收货地址
                "n_ReceiverAdd": recordObj.getValue("shipaddress"),
                "n_Vnote": recordObj.getValue("memo"),
                "internalid": recordObj.id,
                "saOrder_b": subdataList
            }
            const url = getMainUrl() + "NsToMes/CreateRSa";
            return doPostApi(recordObj, url, params, header);
        } catch (e) {
            log.error("pushReturnAuthorization", e);
            return bsworks.https.getFailResponse(e.message);
        }

    }

    /**
    * 推送工单
    */
    const pushWorkOrder = (recordObj) => {
        const header = getHeaderToken();
        if (null == header) {
            return bsworks.https.getFailResponse("token获取失败");
        }
        try {

            //工单组件明细数据，用于计算单位转换后的数量
            const itemDataList = getWorkorderItemList(recordObj.id);
            log.debug("itemitemDataListData", itemDataList);
            const lineCount = recordObj.getLineCount({ sublistId: "item" });
            const subdataList = [];
            for (let line = 0; line < lineCount; line++) {
                const lineuniquekey = recordObj.getSublistValue({ sublistId: "item", fieldId: "lineuniquekey", line: line });
                let bomquantity = recordObj.getSublistValue({ sublistId: "item", fieldId: "bomquantity", line: line });
                const itemData = itemDataList.find(itemd => itemd.lineuniquekey == lineuniquekey);
                if (itemData) {
                    // {bomquantity}/{quantityuom}/NULLIF({quantity}, 0)
                    bomquantity = itemData.bomquantity;
                }
                subdataList.push({
                    //行号
                    "i_Crowno": recordObj.getSublistValue({ sublistId: "item", fieldId: "line", line: line }),
                    //产品编码
                    "n_StockCode": recordObj.getSublistValue({ sublistId: "item", fieldId: "item", line: line }),
                    //产品名称
                    "n_StockName": recordObj.getSublistValue({ sublistId: "item", fieldId: "item", line: line }),
                    //产品规格型号
                    "n_StockFormat": recordObj.getSublistValue({ sublistId: "item", fieldId: "custcol_hc_item_size", line: line }),
                    //标准用量
                    "f_Num": bomquantity,
                    //总用量需求
                    "f_PointAmount": bomquantity,
                    //(NS系统)单据编码
                    "ns_BillCode": recordObj.getValue("tranid"),
                    //(NS系统)单据子表主键
                    "internalid": recordObj.getSublistValue({ sublistId: "item", fieldId: "lineuniquekey", line: line })

                });
            }

            //获取销售订单对应的货品行id
            let Soid = "";
            let createdfrom = recordObj.getValue("createdfrom");
            try {
                let createdformText = recordObj.getText("createdfrom");
                if (!bsworks.isNullOrEmpty(createdfrom) && createdformText.indexOf("销售订单") == 0) {
                    const salesRecord = record.load({ type: "salesorder", id: createdfrom });
                    const lineCount = salesRecord.getLineCount({ sublistId: "item" });
                    for (let line = 0; line < lineCount; line++) {
                        const woid = salesRecord.getSublistValue({ sublistId: "item", fieldId: "woid", line: line });
                        if (woid == recordObj.id) {
                            Soid = salesRecord.getSublistValue({ sublistId: "item", fieldId: "lineuniquekey", line: line });
                            break;
                        }
                    }
                } else {
                    createdfrom = "";
                }
            } catch (e) {
                log.error("获取销售订单对应的货品行id失败", e);
            }
            //获取工单类型
            let n_Type = "";
            //根据物料清单版本获取工单类型
            const billofmaterials = recordObj.getValue("billofmaterials");
            if (null != billofmaterials && "" != billofmaterials) {
                bomRecord = record.load({ type: "bom", id: billofmaterials });
                n_Type = bomRecord.getValue("custrecord_hc_bom_type");
            }

            const params = {
                //单据编号
                "ns_BillCode": recordObj.getValue("tranid"),
                //内部id
                "internalid": recordObj.id,
                //销售订单号
                "ns_SoCode": createdfrom,
                //销售订单货品行ID
                "ns_Soid": Soid,
                //单据日期,生产开始日期
                "n_BillDate": recordObj.getText("startdate"),
                //产品料号
                "n_MatNo": recordObj.getValue("custbody4"),
                //产品编码
                "n_StockCode": recordObj.getValue("assemblyitem"),
                //产品名称
                "n_StockName": recordObj.getText("custbody5"),
                //产品规格
                "n_StockFormat": "",
                //产品型号
                "n_StockModel": "",
                //收货地址
                "f_Num": recordObj.getValue("quantity"),
                //产线
                "n_Assembly": "",
                //备注
                "n_Vnote": recordObj.getValue("memo"),
                //工单类型（1外协、2成品3、自制）
                "n_Type": n_Type,
                //单位机器工时
                "n_machinehour": recordObj.getValue("custbody_ca_ea_machine_hour"),
                //单位人工工时
                "n_manhour": recordObj.getValue("custbody_ca_ea_person_hour"),
                //部分自制
                "n_self": recordObj.getValue("custbody_ca_part_product") ? "是" : "否",
                "pmWorkOrder_b": subdataList
            }
            const url = getMainUrl() + "NsToMes/CreateWoma";
            return doPostApi(recordObj, url, params, header);
        } catch (e) {
            log.error("pushWorkOrder", e);
            return bsworks.https.getFailResponse(e.message);
        }

    }

    /**
   * 获取工单货品明细数据
   */
    const getWorkorderItemList = (internalid) => {
        const searchFields = [
            { id: "internalid", label: "工单id", filter: { values: internalid } },
            { id: "quantityuom", label: "事务处理数量" },
            { id: "bomquantity", label: "bom数量" },
            { id: "quantity", label: "数量" },
            { id: "lineuniquekey", label: "行唯一key" }
        ];
        let dataList = bsworks.search.getSearchAllResultDataList("workorder", searchFields, 1, 1000, null);
        return dataList;
    }

    return {
        getHeaderToken,
        pushPurchaseOrder,
        pushVendorReturnAuthorization,
        pushSalesOrder,
        pushReturnAuthorization,
        pushWorkOrder
    }

});