define(["N/ui/dialog", "N/ui/message", "N/runtime"], (e, t, l) => {
    const n = (e) => null === e || "" === e || " " === e || void 0 === e,
        s = {
            client: {
                LAODING_MASK_ID: "bsworks_loading_mask",
                LOADING_MESSAGE_ID: "bsworks_loading_message",
                LOADING_MASK_IMG_URL:
                    "https://7336086.app.netsuite.com/core/media/media.nl?id=28692&c=7336086&h=Xq73GtcFjvOXxvafAbgoQcjgS3AXq1xJxZTSpEeBW10uzNKe",
            },
            suitelet: {
                SUBLIST_ID: "custpage_subitem_list",
                SUBLIST_TYPE: { LIST: "LIST", INLINEEDITOR: "INLINEEDITOR" },
                SUBLIST_CHECKBOX: "sublist_checkbox",
                SUBLIST_LINE_NUM: "sublist_line_num",
                FILTER_BUTTON_CONFIG: [
                    { id: "custpage_button_search", label: "查&nbsp;&nbsp;询", primary: !0, style: null },
                    { id: "custpage_button_reset", label: "重&nbsp;&nbsp;置", primary: !1, style: null },
                    {
                        id: "custpage_button_exportexcel",
                        label: "&nbsp;&nbsp;导出EXCEL&nbsp;&nbsp;",
                        primary: !1,
                        style: null,
                    },
                ],
                SESSION_SUITELET_CONFIG: "bsworks_suitelet_form_config",
            },
            date: {
                MONTH_ABBR_CAPITAL: {
                    "01": "JAN",
                    "02": "FEB",
                    "03": "MAR",
                    "04": "APR",
                    "05": "MAY",
                    "06": "JUN",
                    "07": "JUL",
                    "08": "AUG",
                    "09": "SEP",
                    10: "OCT",
                    11: "NOV",
                    12: "DEC",
                },
            },
            devops: {
                CACHE: {
                    KEY: "devops_config_cache_data",
                    MODEL_CONFIG_CACHE_ID: "devops_model_cache_data",
                    PLAT_CONFIG_CACHE_ID: "devops_plat_cache_data",
                },
            },
            ac: 165,
        },
        i = {
            string: {
                trim: (e) => (n(e) ? "" : e.replace(/(^\s*)|(\s*$)/g, "")),
                getNultistageName: (e, t, l) => {
                    n(t) && (t = " : "), n(l) && (l = -1);
                    var s = e.split(t);
                    if (s.length > 1) {
                        if (l >= 0 && s.length > l) return s[l];
                        if (l < 0 && s.length + l > 0) return s.reverse(), s[Math.abs(l - 1)];
                    }
                    return s;
                },
                toLowerCase: (e) => (n(e) ? e : e.toLowerCase()),
                toUpperCase: (e) => (n(e) ? e : e.toUpperCase()),
                Base64ToUTF8: (e) =>
                    encode.convert({
                        string: e,
                        inputEncoding: encode.Encoding.BASE_64,
                        outputEncoding: encode.Encoding.UTF_8,
                    }),
                UTF8ToBase64: (e) =>
                    encode.convert({
                        string: e,
                        inputEncoding: encode.Encoding.UTF_8,
                        outputEncoding: encode.Encoding.BASE_64,
                    }),
            },
            number: {
                numberThousandsFormat: (e, t, l, n, s) => {
                    (e = (e + "").replace(/[^0-9+-Ee.]/g, "")), (s = s || "ceil");
                    var i = isFinite(+e) ? +e : 0,
                        a = isFinite(+t) ? Math.abs(t) : 0,
                        r = void 0 === n ? "," : n,
                        o = void 0 === l ? "." : l,
                        u = "",
                        d = function (e, t) {
                            var l = Math.pow(10, t);
                            return "" + parseFloat(Math[s](parseFloat((e * l).toFixed(2 * t))).toFixed(2 * t)) / l;
                        };
                    u = (a ? d(i, a) : "" + Math.round(i)).split(".");
                    for (var c = /(-?\d+)(\d{3})/; c.test(u[0]);) u[0] = u[0].replace(c, "$1" + r + "$2");
                    return (
                        (u[1] || "").length < a &&
                        ((u[1] = u[1] || ""), (u[1] += new Array(a - u[1].length + 1).join("0"))),
                        u.join(o)
                    );
                },
                moneyToChinese: (e) => {
                    var t,
                        l,
                        n,
                        s = new Array("零", "壹", "贰", "叁", "肆", "伍", "陆", "柒", "捌", "玖"),
                        i = new Array("", "拾", "佰", "仟"),
                        a = new Array("", "万", "亿", "兆"),
                        r = new Array("角", "分", "毫", "厘"),
                        o = "整",
                        u = "元",
                        d = 1e15,
                        c = "";
                    if ("" === e) return "";
                    if (((e = parseFloat(e)), e >= d)) return "";
                    if (0 == e) return (c = s[0] + u + o), c;
                    if (
                        ((e = e.toString()),
                            -1 == e.indexOf(".")
                                ? ((t = e), (l = ""))
                                : ((n = e.split(".")), (t = n[0]), (l = n[1].substr(0, 4))),
                            parseInt(t, 10) > 0)
                    ) {
                        for (var p = 0, m = t.length, g = 0; g < m; g++) {
                            var f = t.substr(g, 1),
                                y = m - g - 1,
                                h = y / 4,
                                b = y % 4;
                            "0" == f ? p++ : (p > 0 && (c += s[0]), (p = 0), (c += s[parseInt(f)] + i[b])),
                                0 == b && p < 4 && (c += a[h]);
                        }
                        c += u;
                    }
                    if ("" != l) {
                        var I = l.length;
                        for (g = 0; g < I; g++) {
                            f = l.substr(g, 1);
                            "0" != f && (c += s[Number(f)] + r[g]);
                        }
                    }
                    return "" == c ? (c += s[0] + u + o) : "" == l && (c += o), c;
                },
            },
            object: {
                isNullOrEmpty: (e) =>
                    (e instanceof Array && 0 == e.length) || (e instanceof Object && 0 == Object.keys(e)) || n(e),
                isObject: (e) => e instanceof Array || e instanceof Object,
                removeEmptyKey: (e) => {
                    const t = {};
                    for (const l in e) n(e[l]) || (t[l] = e[l]);
                    return t;
                },
            },
            customHtmlScript: {
                button: {
                    getHtml: (e) => {
                        let t =
                            "margin-top:25px;height:30px;min-width:60px;font-family: Open Sans,Helvetica,sans-serif;font-size: 14px !important;font-weight: 600;cursor: pointer; border-radius:3px;";
                        e.primary
                            ? (t +=
                                "background: #0297f5 !important;border-color: #125ab2 !important;color:white !important;")
                            : (t += "margin-left:35px;background: #fafafa !important;border-color:#b2b2b2 !important;"),
                            n(e.style) || (t += e.style);
                        var l =
                            '<input type="button" style="' +
                            t +
                            '"  value="' +
                            e.label +
                            '" id="' +
                            e.id +
                            '" name="' +
                            e.id +
                            '" ';
                        return (
                            e.primary
                                ? (l +=
                                    "onmouseover=\"this.style.backgroundColor='#125ab2';\" onmouseout=\"this.style.backgroundColor='#0297f5';\" ")
                                : (l +=
                                    "onmouseover=\"this.style.backgroundColor='#e5e5e5';\" onmouseout=\"this.style.background='#fafafa';\" "),
                            (l += ">&nbsp;</button>"),
                            l
                        );
                    },
                    setPrimary: (e) => {
                        const t =
                            ';document.getElementById("' +
                            e +
                            '").style= document.getElementById("' +
                            e +
                            '").style + ";background: #0297f5 !important; height:20px !important;color:white !important;";';
                        return t;
                    },
                },
                field: {
                    layout: (e, t) => {
                        if (n(t)) return "";
                        i.object.isNullOrEmpty(e) && (e = {});
                        const l = n(e.colNum) ? 4 : e.colNum,
                            s = !!n(e.lastColRight) || e.lastColRight;
                        var a =
                            ";var colNum=" +
                            l +
                            ",lastColRight=" +
                            s +
                            ',filterFieldsObj=document.getElementById("tr_fg_' +
                            t +
                            '"),filterChildNodes=filterFieldsObj.childNodes;for (var v=filterChildNodes.length-1;v>=0;v--) {if (filterChildNodes[v].innerText=="") {filterFieldsObj.removeChild(filterChildNodes[v]);} else break;};  filterFieldsObj.removeChild(filterChildNodes[0]); /** filterFieldsObj.removeChild(filterChildNodes[filterChildNodes.length-1]); */ var fieldLength=filterChildNodes.length,rowNum=parseInt(fieldLength/colNum);fieldLength%colNum==0&&rowNum--;for(var index=0,r=1;r<=rowNum&&filterChildNodes.length!=colNum;r++){var newTr=document.createElement("tr");newTr.id = "' +
                            t +
                            '_tr_" + r;newTr.className="uir-fieldgroup-content";for(var i=0;i<colNum;i++){if(lastColRight&&filterChildNodes.length==colNum+1)for(var x=0;x<colNum-(i+1);x++){var emptyTd=document.createElement("td");emptyTd.id="' +
                            t +
                            '_td_" + r + "_" + x;newTr.append(emptyTd)}filterChildNodes.length>colNum&&newTr.append(filterChildNodes[colNum])}filterFieldsObj.parentElement.append(newTr)}';
                        return a;
                    },
                },
                sublist: {
                    notHeaderSort: (e) => {
                        const t =
                            ";var " +
                            e +
                            'Header=document.getElementById("' +
                            e +
                            'header");if(null!=' +
                            e +
                            "Header)for(var children=" +
                            e +
                            'Header.children,i=0;i<children.length;i++)children[i].removeAttribute("onclick");';
                        return t;
                    },
                    addSummaryContent: (e, t, l) => {
                        let n = ".uir-list-control-bar";
                        t == s.suitelet.SUBLIST_TYPE.INLINEEDITOR && (n = ".uir-listheader-button-row");
                        const i =
                            ';jQuery("#' +
                            e +
                            "_layer " +
                            n +
                            '")' +
                            (t == s.suitelet.SUBLIST_TYPE.INLINEEDITOR ? '.append("<td>")' : "") +
                            ".append(\"<div id='" +
                            e +
                            "Bar' style='position: absolute;right: 30px;top: 13px;font-weight: bold;font-size: 14px;color: #3d3d3d;'>" +
                            l +
                            '</div>")' +
                            (t == s.suitelet.SUBLIST_TYPE.INLINEEDITOR ? '.append("</td>")' : "") +
                            ";";
                        return i;
                    },
                },
            },
        },
        a = (e) => {
            const t = (t) =>
                n(t) ? "" : e.parse({ value: t, type: e.Type.DATE, timezone: e.Timezone.ASIA_HONG_KONG }),
                l = (t) =>
                    n(t) ? "" : e.parse({ value: t, type: e.Type.DATETIME, timezone: e.Timezone.ASIA_HONG_KONG }),
                s = (t) => (n(t) ? "" : e.format({ value: t, type: "date" })),
                i = (t) => (
                    t || (t = new Date()),
                    e.format({ value: t, type: e.Type.DATETIME, timezone: e.Timezone.ASIA_HONG_KONG })
                ),
                a = (t) => (
                    t || (t = new Date()),
                    e.parse({ value: t, type: e.Type.DATETIME, timezone: e.Timezone.ASIA_HONG_KONG })
                ),
                r = (e, l, s, a, r, o) => {
                    let u = i(o);
                    (u = t(u.substring(0, 10))),
                        n(l) || u.setFullYear(u.getFullYear() + l),
                        n(s) || u.setMonth(u.getMonth() + s),
                        n(a) || u.setDate(u.getDate() + a);
                    const d = u.getFullYear();
                    let c = u.getMonth() + 1;
                    parseInt(c) < 10 && (c = "0" + c);
                    let p = u.getDate();
                    parseInt(p) < 10 && (p = "0" + p), null == e && (e = "-");
                    let m = d;
                    return n(r) && (r = 3), r > 1 && (m += e + c), r > 2 && (m += e + p), m;
                },
                o = (e, t) => (n(e) && n(t) ? [] : (n(e) && (e = "2000-01-01"), n(t) && (t = "2050-01-01"), [e, t])),
                u = (t) => {
                    t ||
                        (t = e.format({
                            value: new Date(),
                            type: e.Type.DATETIME,
                            timezone: e.Timezone.ASIA_HONG_KONG,
                        }));
                    let l = e.parse({ value: t, type: e.Type.DATE, timezone: e.Timezone.ASIA_HONG_KONG });
                    l.getDate() > 1 && l.setDate(1), l.getDate() > 1 && l.setDate(1);
                    let n = new Date(l);
                    return (
                        n.setMonth(l.getMonth() + 1),
                        n.setDate(0),
                        (l = e.format({ value: l, type: "date" })),
                        (n = e.format({ value: n, type: "date" })),
                        [l, n]
                    );
                },
                d = (e, t) => {
                    const l = [];
                    for (let n = 0; n < t.length; n++) {
                        const s = t[n];
                        if ("Y" == s) l.push(e.getYear());
                        else if ("y" == s) l.push(e.getFullYear());
                        else if ("M" == s) {
                            let t = e.getMonth() + 1;
                            t < 10 && (t = "0" + t), l.push(t);
                        } else if ("d" == s) {
                            let t = e.getDate();
                            t < 10 && (t = "0" + t), l.push(t);
                        } else if ("h" == s) {
                            let t = e.getHours();
                            t < 10 && (t = "0" + t), l.push(t);
                        } else if ("m" == s) {
                            let t = e.getMinutes();
                            t < 10 && (t = "0" + t), l.push(t);
                        } else if ("s" == s) {
                            let t = e.getSeconds();
                            t < 10 && (t = "0" + t), l.push(t);
                        } else
                            "q" == s
                                ? l.push(Math.floor((e.getMonth() + 3) / 3))
                                : "S" == s
                                    ? l.push(e.getMilliseconds())
                                    : l.push(s);
                    }
                    return l.join("");
                };
            return {
                stringToDate: t,
                stringToDateTime: l,
                dateToString: s,
                getCurrentTimezoneStr: i,
                getCurrentTimezoneDate: a,
                getCurrentDate: r,
                getFilterRangeDate: o,
                getFirstAndEndtDayInCurrent: u,
                formatDate: d,
            };
        },
        r = (e) => {
            const t = (e, t, n, s, i, a) => {
                parseInt(n) > 1 && (n = 1), 0 == (parseFloat(i) || 0) && (i = 50);
                let r = l(e, t, n, s, a);
                if (1e3 == r.length)
                    for (let o = 0; o < parseInt(i); o++) {
                        n++;
                        const i = l(e, t, n, s, a);
                        if (((r = r.concat(i)), i.length < 1e3)) break;
                    }
                return r;
            },
                l = (e, t, l, a, r) => {
                    const o = [];
                    try {
                        const p = i(e, t, l, a);
                        if (0 == p.length) return o;
                        for (var d = 0; d < p.length; d++) {
                            const e = p[d];
                            let l = {};
                            (null == r || null == r.returnSortNo || r.returnSortNo) &&
                                (l[s.suitelet.SUBLIST_LINE_NUM] = d + 1);
                            for (var c = 0; c < t.length; c++) {
                                const s = u(t[c]),
                                    i = s.searchType;
                                if ("none" == i) {
                                    null != s.defaultValue && (l[s.name] = s.defaultValue);
                                    continue;
                                }
                                let a = { name: s.id };
                                null != s.searchSummary && (a.summary = s.searchSummary),
                                    null != s.searchFormula && (a.formula = s.searchFormula),
                                    null != s.join && (a.join = s.join);
                                const r = s.name;
                                let o = e.getValue(a);
                                if (("checkbox" == s.type && (o = "true" === o || !0 === o ? "T" : "F"), !n(i)))
                                    if ("text" == i) o = e.getText(a);
                                    else if ("valueText" == i) {
                                        const t = r + "_display_name";
                                        l[t] = e.getText(a);
                                    }
                                l[r] = o;
                            }
                            o.push(l);
                        }
                    } catch (e) {
                        log.debug("执行getSearchResultDataList方法出错", e);
                    }
                    return o;
                },
                i = (e, t, l, s) => {
                    const i = r(t),
                        u = a(t);
                    (n(l) || parseInt(l) < 1) && (l = 1), (n(s) || parseInt(s) > 1e3) && (s = 1e3);
                    var d = (parseInt(l) - 1) * parseInt(s),
                        c = parseInt(l) * parseInt(s);
                    return o(e, u, i, d, c);
                },
                a = (e) => {
                    const t = [];
                    for (var l = 0; l < e.length; l++) {
                        var n = u(e[l]);
                        if ("none" != n.searchType) {
                            var s = {};
                            (s.name = n.id),
                                null != n.searchSort && (s.sort = n.searchSort),
                                null != n.searchSummary && (s.summary = n.searchSummary),
                                null != n.searchFormula && (s.formula = n.searchFormula),
                                null != n.join && (s.join = n.join),
                                t.push(s);
                        }
                    }
                    return t;
                },
                r = (e) => {
                    const t = [];
                    for (var l = 0; l < e.length; l++) {
                        const a = e[l];
                        if (!n(a.filter)) {
                            var s = u(a);
                            if (
                                (!n(s.filterValues) && 0 != s.filterValues.length) ||
                                "isnotempty" == s.filterOperator ||
                                "isempty" == s.filterOperator
                            ) {
                                var i = { name: s.id, operator: s.filterOperator };
                                null != s.filterName && (i.name = s.filterName),
                                    null != s.join && (i.join = s.join),
                                    null != s.searchFormula && (i.formula = s.searchFormula),
                                    "isnotempty" != s.filterOperator &&
                                    "isempty" != s.filterOperator &&
                                    (i.values = s.filterValues),
                                    t.push(i);
                            }
                        }
                    }
                    return t;
                },
                o = (t, l, n, s, i) => {
                    const a = e.create({ type: t, columns: l, filters: n });
                    return a.run().getRange({ start: s, end: i });
                },
                u = (e) => {
                    const t = e.id,
                        l = n(e.alias) ? t : e.alias,
                        s = n(e.join) ? null : e.join;
                    let i = "value",
                        a = null,
                        r = null,
                        o = null,
                        u = null,
                        d = null,
                        c = "is",
                        p = null;
                    if (!n(e.search)) {
                        const t = e.search;
                        n(t.type) || (i = t.type),
                            n(t.summary) || (a = t.summary),
                            n(t.formula) || (r = t.formula),
                            n(t.sort) || (o = t.sort),
                            n(t.defaultValue) || (u = t.defaultValue);
                    }
                    if (!n(e.filter)) {
                        const t = e.filter;
                        n(t.id) || (d = t.id),
                            n(t.operator) || (c = t.operator),
                            n(t.values) || (t.values instanceof Array && 0 == t.values.length) || (p = t.values);
                    }
                    let m = "text";
                    n(e.type) || (m = e.type);
                    let g = "inline";
                    return (
                        n(e.displayType) || (g = e.displayType),
                        {
                            id: t,
                            name: l,
                            type: m,
                            displayType: g,
                            join: s,
                            searchType: i,
                            searchSummary: a,
                            searchFormula: r,
                            searchSort: o,
                            defaultValue: u,
                            filterName: d,
                            filterOperator: c,
                            filterValues: p,
                        }
                    );
                };
            return { getSearchAllResultDataList: t, getSearchResultDataList: l };
        },
        o = (e) => {
            const t = (e, t, n, s, i) => {
                parseInt(n) > 1 && (n = 1), 0 == (parseFloat(i) || 0) && (i = 50);
                let a = l(e, t, n, s);
                if (1e3 == a.length)
                    for (var r = 0; r < parseInt(i); r++) {
                        n++;
                        var o = l(e, t, n, s);
                        if (((a = a.concat(o)), o.length < 1e3)) break;
                    }
                return a;
            },
                l = (t, l, i, o) => {
                    const u = [],
                        d = e.load({ id: t }),
                        c = d.columns,
                        p = d.filters,
                        m = {};
                    if (null != l && l.length > 0) {
                        for (let e = 0; e < l.length; e++) {
                            const t = l[e],
                                n = a(c, t);
                            if (n) {
                                t.alias && (m[r(n)] = t.alias);
                                continue;
                            }
                            const i = s(t);
                            i && (c.push(i), i.alias && (m[r(i)] = i.alias));
                        }
                        const e = l.filter((e) => e.filter);
                        for (let t = 0; t < e.length; t++) {
                            const l = e[t],
                                n = l.filter;
                            ((n.values && 0 != n.values.length) ||
                                "isnotempty" == n.operator ||
                                "isempty" == n.operator) &&
                                (n.name || (n.name = l.id),
                                    l.join && (n.join = l.join),
                                    l.search && l.search.formula && (n.formula = l.search.formula),
                                    n.operator || (n.operator = "is"),
                                    p.push(n));
                        }
                    }
                    (d.filters = p),
                        (d.columns = c),
                        (n(i) || parseInt(i) < 1) && (i = 1),
                        (n(o) || parseInt(o) > 1e3) && (o = 1e3);
                    var g = (parseInt(i) - 1) * parseInt(o),
                        f = parseInt(i) * parseInt(o);
                    const y = d.run().getRange({ start: g, end: f });
                    if (0 == y.length) return u;
                    const h = [];
                    return (
                        null != l &&
                        l.length > 0 &&
                        l.forEach((e) => {
                            if (e.search && "valueText" == e.search.type) {
                                let t = e.id;
                                e.alias && (t = e.alias), h.push(t);
                            }
                        }),
                        y.forEach((e, t) => {
                            const l = { sublist_line_num: t + 1 + "" };
                            let n = 0;
                            c.forEach((t) => {
                                let s = m[r(t)];
                                s || (s = t.name),
                                    0 == s.indexOf("formula") && (n++, (s = s + "_" + n)),
                                    (l[s] = e.getValue(t)),
                                    -1 != h.indexOf(s) && (l[s + "_display_name"] = e.getText(t));
                            }),
                                u.push(l);
                        }),
                        u
                    );
                },
                s = (e) => {
                    if (e.search && "none" == e.search.type) return null;
                    const t = { name: e.id, alias: e.alias };
                    return (
                        e.search &&
                        (e.search.sort && (t.sort = e.search.sort),
                            e.search.summary && (t.summary = e.search.summary),
                            e.search.formula && (t.formula = e.search.formula)),
                        null != e.join && (t.join = e.join),
                        t
                    );
                },
                a = (e, t) => {
                    let l = null;
                    for (var n = 0; n < e.length; n++) {
                        let s = e[n].join;
                        s && (s = i.string.toLowerCase(s));
                        let a = t.join;
                        if ((a && (a = i.string.toLowerCase(a)), e[n].name == t.id && s == a)) {
                            l = e[n];
                            break;
                        }
                    }
                    return l;
                },
                r = (e) => e.name + "#" + (e.join || "");
            return { getSearchAllResultDataList: t, getSearchResultDataList: l };
        },
        u = (e) => {
            const t = (t) => {
                const l = e.get({ url: t });
                return JSON.parse(l.body);
            },
                l = (t, l) => {
                    const n = e.post({
                        url: t,
                        body: l,
                        headers: { Accept: "*/*", "Content-Type": "application/json" },
                    });
                    return JSON.parse(n.body);
                };
            return { get: t, post: l };
        },
        d = (e, t) => {
            const s = (t, l, n) => {
                const s = e.post({
                    url: a(t),
                    body: r(l, n),
                    headers: { Accept: "*/*", "Content-Type": "application/json" },
                });
                return JSON.parse(s.body);
            },
                a = (e) => t.resolveScript({ scriptId: "customscript_" + e, deploymentId: "customdeploy_" + e }),
                r = (e, t) => {
                    const l = { type: e, data: t };
                    return JSON.stringify(l);
                },
                o = (e, t, l) => (
                    n(e) && (e = "success"),
                    n(t) && (t = "操作成功"),
                    n(l) && (l = {}),
                    { status: e, message: t, data: l }
                ),
                u = (e, t) => (n(e) && (e = "操作成功"), n(t) && (t = {}), { status: "success", message: e, data: t }),
                d = (e, t) => ({ status: "fail", message: e, data: t }),
                c = (e, t) => {
                    !n(t) && i.object.isObject(t) && (t = JSON.stringify(t)),
                        l.getCurrentSession().set({ name: e, value: t });
                },
                p = (e, t) => {
                    let s = l.getCurrentSession().get({ name: e });
                    return !n(s) && t && (s = JSON.parse(s)), s;
                };
            return {
                post: s,
                getSuiteletUrl: a,
                getRequestBody: r,
                getResponseObject: o,
                getSuccessResponse: u,
                getFailResponse: d,
                setSessionValue: c,
                getSessionValue: p,
            };
        },
        c = (l, n) => {
            const s = (e, t, n) => {
                n || (n = l.TaskType.MAP_REDUCE), t || (t = "bws_plat_common_mr");
                const s = l.create({
                    taskType: n,
                    scriptId: "customscript_" + t,
                    deploymentId: "customdeploy_" + t,
                    params: e,
                });
                return s.submit();
            },
                i = (l, s, i, a) => {
                    function r(t) {
                        const l = d(n).post(i, "getReduceStatus", { taskId: t });
                        if ("fail" == l.status) e.alert({ title: "提示", message: l.message });
                        else {
                            const t = l.data.taskStatus;
                            var s = "任务进行中";
                            "COMPLETE" == t ? (s = "任务处理成功") : "FAILED" == t && (s = "任务处理失败"),
                                e.alert({ title: "提示", message: s });
                        }
                    }
                    const o = t.create({
                        title: l,
                        message:
                            "<div id='reduceMessageDiv' style='margin-top:10px;'>您操作的记录条数为<span id='reduceMessageSpan' style='font-weight:bold;'>" +
                            s +
                            "</span>条，已启用异步线程处理任务，任务执行期间<span style='font-weight:bold;'>请勿操作当前页面</span>，点击<a id='reduceScheduleA' style='font-weight:bold;text-decoration:underline;cursor: pointer;' >此处</a>查询任务进度<div>",
                        type: t.Type.CONFIRMATION,
                    });
                    return (
                        o.show(),
                        setTimeout(() => {
                            document.querySelector("#div__alert").scrollIntoView(!0);
                        }, 100),
                        setTimeout(() => {
                            const e = document.getElementById("reduceScheduleA");
                            e &&
                                e.addEventListener("click", () => {
                                    setTimeout(() => {
                                        r(n, a);
                                    }, 100);
                                });
                        }, 1e3),
                        o
                    );
                },
                a = (e) => {
                    let t = d().getSuccessResponse();
                    try {
                        var n = l.checkStatus(e),
                            s = n.status;
                        t.data = { taskStatus: s };
                    } catch (e) {
                        log.debug("getReduceStatus", e), (t.status = "fail"), (t.message = e.message);
                    }
                    return t;
                };
            return { createTask: s, createReduceMessage: i, getReduceStatus: a };
        },
        p = (t) => {
            const l = (e) => {
                const t = d().getSessionValue(s.suitelet.SESSION_SUITELET_CONFIG, !0);
                return o.createLoadingMask(), i.filterButtonListener(e, t), i.sublistButtonListener(e, t), t;
            },
                i = {
                    filterButtonListener: (e, t) => {
                        if (null == t) return;
                        let l = [],
                            n = t.fieldGroupConfig.find((e) => e.isFilterGroup);
                        null != n &&
                            (l =
                                null != n.buttons && 0 == n.buttons.length
                                    ? s.suitelet.FILTER_BUTTON_CONFIG
                                    : n.buttons),
                            null != l &&
                            l.length > 0 &&
                            ((n.suiteletScriptName =
                                null == t.scriptConfig ? null : t.scriptConfig.suiteletScriptName),
                                l.forEach((l) => {
                                    if (null == l.addEventListener || l.addEventListener) {
                                        const s = document.getElementById(l.id);
                                        s.addEventListener("click", function () {
                                            o.showLoadingMask(l.id),
                                                setTimeout(function () {
                                                    "custpage_button_search" == s.id
                                                        ? a.doSearch(e, s.id, n)
                                                        : "custpage_button_reset" == s.id
                                                            ? a.doReset(e, s.id, n)
                                                            : "custpage_button_exportexcel" == s.id &&
                                                            a.doExportExcel(e, s.id, t.title, t.sublistConfig[0]);
                                                }, 100);
                                        });
                                    }
                                }));
                    },
                    sublistButtonListener: (e, t) => {
                        null != t &&
                            t.sublistConfig.forEach((t) => {
                                let l = t.buttons;
                                if (null != l && l.length > 0) {
                                    const n = t.id;
                                    l.forEach((t) => {
                                        if (t.addEventListener) {
                                            const l = t.id,
                                                i = document.getElementById(l);
                                            i.addEventListener("click", function () {
                                                o.showLoadingMask(l),
                                                    setTimeout(function () {
                                                        "custpage_button_checked_all" == l &&
                                                            a.sublistCheckedAll(
                                                                e,
                                                                n,
                                                                s.suitelet.SUBLIST_CHECKBOX,
                                                                l,
                                                                "全  选",
                                                                "取消全选"
                                                            );
                                                    }, 100);
                                            });
                                        }
                                    });
                                }
                            });
                    },
                },
                a = {
                    doSearch: (t, l, s) => {
                        try {
                            const r = t.currentRecord,
                                u = s.fields;
                            for (var i = 0; i < u.length; i++) {
                                const t = u[i];
                                if (null != t.required && t.required) {
                                    const l = r.getValue(t.id);
                                    if (n(l))
                                        return void e.alert({
                                            title: "提示",
                                            message: "过滤器 - " + t.label + "不能为空！",
                                        });
                                }
                            }
                            a.doSearchSuitelet(r, s, !1);
                        } catch (t) {
                            console.log(t), e.alert({ title: "错误提示", message: t.message });
                        } finally {
                            o.clearLoadingMask(l);
                        }
                    },
                    doReset: (t, l, n) => {
                        try {
                            const s = t.currentRecord;
                            a.doSearchSuitelet(s, n, !0);
                        } catch (t) {
                            console.log(t), e.alert({ title: "错误提示", message: t.message });
                        } finally {
                            o.clearLoadingMask(l);
                        }
                    },
                    doSearchSuitelet: (e, l, n, s) => {
                        setWindowChanged(window, !1);
                        const i = a.geSearchParameters(e, l.fields, n, s),
                            r = t.resolveScript({
                                scriptId: "customscript_" + l.suiteletScriptName,
                                deploymentId: "customdeploy_" + l.suiteletScriptName,
                                params: i,
                            });
                        window.location.href = "https://" + t.resolveDomain({ hostType: t.HostType.APPLICATION }) + r;
                    },
                    geSearchParameters: (e, t, l, s) => {
                        let i = { pageInit: l },
                            a = {};
                        for (var r = 0; r < t.length; r++) {
                            const s = t[r];
                            if ("inlinehtml" == s.type) continue;
                            let i = n(s.defaultValue) ? "" : s.defaultValue;
                            const o = s.id;
                            l ||
                                ((i = e.getValue(s.id)),
                                    "date" == s.type && (i = e.getText(s.id)),
                                    null != s.type && "select" == s.type && (a[o + "_display_name"] = e.getText(s.id))),
                                (a[o] = i);
                        }
                        if (s && Object.keys(s).length > 0) for (const e in s) a[e] = s[e];
                        return (i.defaultValues = JSON.stringify(a)), i;
                    },
                    sublistCheckedAll(t, l, n, s, i, a) {
                        const r = document.getElementById(s);
                        var u = !0;
                        -1 != r.value.indexOf(a) && (u = !1);
                        try {
                            const d = t.currentRecord,
                                c = d.getLineCount({ sublistId: l });
                            if (0 == c) return;
                            for (let e = 0; e < c; e++)
                                d.selectLine({ sublistId: l, line: e }),
                                    d.setCurrentSublistValue({ sublistId: l, fieldId: n, value: u });
                            d.commitLine({ sublistId: l }), (r.value = u ? a : i);
                        } catch (t) {
                            console.log(t), e.alert({ title: "错误提示", message: t.message });
                        } finally {
                            o.clearLoadingMask(s);
                        }
                    },
                    doExportExcel: (t, l, i, a, u) => {
                        try {
                            let c = "序号";
                            null == a.excel || null == a.excel.show_sort_no || a.excel.show_sort_no || (c = "");
                            const p = [],
                                m = {},
                                g = a.fields;
                            for (var d = 0; d < g.length; d++) {
                                const e = g[d];
                                let t = n(e.displayType) ? "inline" : e.displayType;
                                if (
                                    (null != e.excel && null != e.excel.displayType && (t = e.excel.displayType),
                                        "hidden" == t)
                                )
                                    continue;
                                const l = n(e.alias) ? e.id : e.alias,
                                    s = n(e.type) ? null : e.type;
                                null == s || ("float" != s && "integer" != s && "currency" != s) || (m[l] = 0);
                                let i = e.label;
                                null == e.excel || n(e.excel.label) || (i = e.excel.label),
                                    (c += ("" == c ? "" : ",") + i);
                                const a = { id: l, type: s, displayType: t, excel: e.excel };
                                p.push(a);
                            }
                            (c += "\n"), null == u && (u = r.getSublistDatalist(t, p, a.id, !0));
                            let f = "";
                            for (let e = 0; e < u.length; e++) {
                                const t = u[e];
                                for (const l in t) {
                                    if (l == s.suitelet.SUBLIST_CHECKBOX) continue;
                                    if (
                                        l == s.suitelet.SUBLIST_LINE_NUM &&
                                        null != a.excel &&
                                        null != a.excel.show_sort_no &&
                                        !a.excel.show_sort_no
                                    )
                                        continue;
                                    let i = t[l];
                                    if (
                                        (null != m[l]
                                            ? (n(i) && (i = 0), (m[l] = parseFloat(m[l]) + parseFloat(i)))
                                            : (-1 != (i + "").indexOf(",") && (i = '"' + i + '"'),
                                                "boolean" == typeof i && (i = i ? "是" : "否")),
                                            (c += i + ","),
                                            e == u.length - 1 && (null == a.hasSummary || a.hasSummary))
                                    )
                                        if (l == s.suitelet.SUBLIST_LINE_NUM) f += "合计,";
                                        else if (null != m[l]) {
                                            let e = m[l];
                                            (e = e.toFixed(2)), (f += e + ",");
                                        } else f += ",";
                                }
                                c += "\n";
                            }
                            (null == a.hasSummary || a.hasSummary) && (c += f + "\n");
                            const y = "data:text/csv;charset=utf-8,\ufeff" + encodeURIComponent(c),
                                h = document.createElement("a");
                            (h.href = y), (h.download = i + ".csv"), h.click();
                        } catch (t) {
                            console.log(t), e.alert({ title: "错误提示", message: t.message });
                        } finally {
                            o.clearLoadingMask(l);
                        }
                    },
                },
                r = {
                    getSublistDatalist: (e, t, l, i, a, r) => {
                        const o = e.currentRecord;
                        n(l) && (l = s.suitelet.SUBLIST_ID);
                        const u = [],
                            d = [],
                            c = o.getLineCount({ sublistId: l });
                        if (0 == c) return u;
                        for (let e = 0; e < c; e++) {
                            const r = {};
                            r[s.suitelet.SUBLIST_LINE_NUM] = e + 1;
                            let c = o.getSublistValue({ sublistId: l, fieldId: s.suitelet.SUBLIST_CHECKBOX, line: e });
                            if ((n(c) && (c = !1), null == a || !a || c)) {
                                r[s.suitelet.SUBLIST_CHECKBOX] = c;
                                for (let s = 0; s < t.length; s++) {
                                    const a = t[s],
                                        u = n(a.alias) ? a.id : a.alias;
                                    let d = "";
                                    if (null != a.type && "date" == a.type)
                                        d = o.getSublistText({ sublistId: l, fieldId: u, line: e });
                                    else if (
                                        null == a.type ||
                                        "select" != a.type ||
                                        null == a.displayType ||
                                        ("entry" != a.displayType && "disabled" != a.displayType)
                                    )
                                        d = o.getSublistValue({ sublistId: l, fieldId: u, line: e });
                                    else if (i) d = o.getSublistText({ sublistId: l, fieldId: u, line: e });
                                    else {
                                        d = o.getSublistValue({ sublistId: l, fieldId: u, line: e });
                                        const t = o.getSublistText({ sublistId: l, fieldId: u, line: e });
                                        r[u + "_display_name"] = t;
                                    }
                                    if (i && null != a.excel) {
                                        const e = a.excel;
                                        n(e.valuePrefix) || (d = e.valuePrefix + d),
                                            n(e.valueSuffix) || (d += e.valueSuffix);
                                    }
                                    r[u] = d;
                                }
                                u.push(r), c && d.push(r);
                            }
                        }
                        return r ? u : 0 == d.length ? u : d;
                    },
                    showSublistSummary: (e, t, l) => {
                        null == l && (l = !1);
                        const n = r.getSublistDatalist(e, t.fields, t.id, !1, l),
                            s = m().sublist.getSummaryContent(t, n);
                        jQuery("#" + t.id + "Bar").html(s);
                    },
                },
                o = {
                    createLoadingMask: (e) => {
                        function t() {
                            let e = 0;
                            return (
                                (e =
                                    document.body.clientHeight && document.documentElement.clientHeight
                                        ? document.body.clientHeight < document.documentElement.clientHeight
                                            ? document.body.clientHeight
                                            : document.documentElement.clientHeight
                                        : document.body.clientHeight > document.documentElement.clientHeight
                                            ? document.body.clientHeight
                                            : document.documentElement.clientHeight),
                                e
                            );
                        }
                        let l = "执行中，请稍后...",
                            n = s.client.LAODING_MASK_ID;
                        if (
                            (null != e && null != e.message && (l = e.message),
                                null != e && null != e.maskId && (n = e.maskId),
                                document.getElementById(n))
                        )
                            return void (document.getElementById(n).style.display = "block");
                        const i = document.createElement("div");
                        (i.id = n),
                            (i.style.display = "none"),
                            (i.style.left = "0px"),
                            (i.style.top = "0px"),
                            (i.style.bottom = "0px"),
                            (i.style.right = "0px"),
                            (i.style.position = "fixed"),
                            (i.style.zIndex = 99999),
                            (i.style.background = "rgba(0,0,0,0.1)"),
                            (i.style.width = "100%");
                        const a = t();
                        (i.style.height = a + "px"),
                            (i.innerHTML =
                                "<div style='font-size:18px; text-align: center; line-height:" +
                                a +
                                "px; font-weight: bold;'><img src='" +
                                s.client.LOADING_MASK_IMG_URL +
                                "'/><span id='" +
                                s.client.LOADING_MESSAGE_ID +
                                "'>" +
                                l +
                                "<span></div>"),
                            document.body.appendChild(i);
                    },
                    showLoadingMask: (e, t) => {
                        if (n(e)) return;
                        n(t) && (t = s.client.LAODING_MASK_ID);
                        const l = document.getElementById(e);
                        (l.disabled = !0), (document.getElementById(t).style.display = "block");
                    },
                    clearLoadingMask: (e, t) => {
                        if (!n(e)) {
                            const t = document.getElementById(e);
                            null != typeof t && (t.disabled = !1);
                        }
                        n(t) && (t = s.client.LAODING_MASK_ID),
                            document.getElementById(t) && (document.getElementById(t).style.display = "none");
                    },
                };
            return { pageInit: l, listener: i, sublist: r, event: a, mask: o };
        },
        m = (e) => {
            const t = (e, t) => {
                const l = !(!n(e.pageInit) && "true" != e.pageInit);
                return (
                    (e.pageInit = l),
                    l
                        ? (e.defaultValues = t)
                        : ((t = JSON.parse(e.defaultValues)),
                            null != t.custpage_filter_start_date &&
                            null != t.custpage_filter_end_date &&
                            (t.custpage_filter_date = a().getFilterRangeDate(
                                t.custpage_filter_start_date,
                                t.custpage_filter_end_date
                            )),
                            (e.defaultValues = t),
                            null != t.custpage_page_index && (e.pageIndex = t.custpage_page_index),
                            null != t.custpage_page_size && (e.pageSize = t.custpage_page_size)),
                    e
                );
            },
                l = {
                    customPageScript: "",
                    create: (t, a, u) => {
                        const c = n(t.title) ? "自定义表单" : t.title,
                            p = !n(t.hideNavBar) && t.hideNavBar,
                            m = e.createForm({ title: c, hideNavBar: p });
                        null == t.scriptConfig ||
                            n(t.scriptConfig.clientScriptModuleName) ||
                            (m.clientScriptModulePath =
                                t.scriptConfig.scriptModulePath + t.scriptConfig.clientScriptModuleName + ".js"),
                            (l.customPageScript += n(t.customPageScript) ? "" : t.customPageScript),
                            null != t.fieldGroupConfig &&
                            t.fieldGroupConfig.length > 0 &&
                            t.fieldGroupConfig.forEach((e) => {
                                o.create(m, e, a),
                                    (l.customPageScript += i.customHtmlScript.field.layout(e.layoutConfig, e.id));
                            });
                        const g = {};
                        let f = "";
                        if (
                            (null != t.sublistConfig &&
                                t.sublistConfig.length > 0 &&
                                t.sublistConfig.forEach((e, t) => {
                                    f = e.id;
                                    const l = null == u || null == u[e.id] ? [] : u[e.id],
                                        n = r.create(m, e, l, t);
                                    g[e.id] = n;
                                }),
                                !n(l.customPageScript))
                        ) {
                            let t = { id: "custpage_page_script", label: " ", type: e.FieldType.INLINEHTML };
                            n(f) || (t.container = f),
                                (m.addField(t).defaultValue =
                                    '<script type="text/javascript">(function () {' +
                                    l.customPageScript +
                                    "}());</script>");
                        }
                        return d().setSessionValue(s.suitelet.SESSION_SUITELET_CONFIG, t), { form: m, sublists: g };
                    },
                },
                r = {
                    create: (t, a, o, u) => {
                        const d = n(a.type) ? e.SublistType.LIST : a.type,
                            c = t.addSublist({ id: a.id, type: d, label: a.label });
                        d == e.SublistType.LIST &&
                            null != a.addMarkAllButtons &&
                            a.addMarkAllButtons &&
                            c.addMarkAllButtons(),
                            (null == a.hasCheckbox || a.hasCheckbox) &&
                            c.addField({ id: s.suitelet.SUBLIST_CHECKBOX, type: "checkbox", label: "选择" });
                        let p = s.suitelet.SUBLIST_LINE_NUM;
                        null != u && parseInt(u) > 0 && (p += u);
                        var m = c.addField({ id: p, type: "integer", label: "序号" });
                        if (
                            (d == e.SublistType.INLINEEDITOR && m.updateDisplayType({ displayType: "disabled" }),
                                a.fields.forEach((e) => {
                                    r.addField(c, d, e);
                                }),
                                null != a.buttons &&
                                a.buttons.forEach((e) => {
                                    r.addButton(c, e);
                                }),
                                null == a.hasHeaderSort ||
                                a.hasHeaderSort ||
                                (l.customPageScript += i.customHtmlScript.sublist.notHeaderSort(a.id)),
                                null != a.hasSummary && a.hasSummary)
                        ) {
                            const e = r.getSummaryContent(a, o);
                            l.customPageScript += i.customHtmlScript.sublist.addSummaryContent(a.id, d, e);
                        }
                        return null != o && r.addData(c, o), c;
                    },
                    addField: (e, t, l) => {
                        const s = n(l.displayType) ? "inline" : l.displayType;
                        if ("none" == s) return;
                        const i = n(l.alias) ? l.id : l.alias,
                            a = n(l.type) ? "text" : l.type,
                            r = { id: i, label: l.label, type: a };
                        "select" != a || n(l.source) || (r.source = l.source);
                        const o = e.addField(r);
                        "select" == a &&
                            n(l.source) &&
                            null != l.selectOptions &&
                            ((null == l.showEmptyItem || l.showEmptyItem) &&
                                o.addSelectOption({ value: "", text: "-全部-" }),
                                l.selectOptions.forEach((e) => {
                                    const t = { value: e.value, text: e.text };
                                    e.isSelected && (t.isSelected = !0), o.addSelectOption(t);
                                })),
                            "list" == t.toLowerCase() && "disabled" == s
                                ? o.updateDisplayType({ displayType: "entry" }).updateDisplayType({ displayType: s })
                                : o.updateDisplayType({ displayType: s }),
                            null != l.displaySize && o.updateDisplaySize(l.displaySize);
                    },
                    addButton: (e, t) => {
                        e.addButton({ id: t.id, label: t.label }),
                            t.primary && (l.customPageScript += i.customHtmlScript.button.setPrimary(t.id));
                    },
                    getSummaryContent: (e, t) => {
                        function l(e, t) {
                            let l = [];
                            return null == t || 0 == t.length
                                ? l
                                : (e.forEach((e) => {
                                    if (null != e.summary && (null == e.summary.display || e.summary.display)) {
                                        const t = n(e.alias) ? e.id : e.alias,
                                            s = n(e.summary.label) ? e.label + "合计" : e.summary.label;
                                        l.push({ id: t, label: s });
                                    }
                                }),
                                    0 == l.length
                                        ? l
                                        : ((l = l.map((e) => {
                                            let l = !1,
                                                s = 0,
                                                i = 0;
                                            return (
                                                t.forEach((t) => {
                                                    (l = !!t.sublist_checkbox),
                                                        n(t[e.id]) ||
                                                        ((s = parseFloat(s) + parseFloat(t[e.id])),
                                                            l && (i = parseFloat(i) + parseFloat(t[e.id])));
                                                }),
                                                (s = s.toFixed(2)),
                                                (i = i.toFixed(2)),
                                                (e.totalSummary = s),
                                                (e.selectedSummary = i),
                                                (e.hasSelected = l),
                                                e
                                            );
                                        })),
                                            l));
                        }
                        const s = e.fields,
                            a = l(s, t);
                        let r = "";
                        return (
                            a.forEach((e) => {
                                let t = e.hasSelected ? e.selectedSummary : e.totalSummary;
                                (t = i.number.numberThousandsFormat(t, 2, ".", ",")),
                                    (r +=
                                        "<span id='total_" +
                                        e.id +
                                        "' style='margin-left:30px;'>" +
                                        e.label +
                                        "：" +
                                        t +
                                        "</span>");
                            }),
                            r
                        );
                    },
                    addData: (e, t) => {
                        null != t &&
                            0 != t.length &&
                            t.forEach((t, l) => {
                                for (const i in t) {
                                    if (i == s.suitelet.SUBLIST_LINE_NUM) {
                                        e.setSublistValue({ id: i, value: l + 1, line: l });
                                        continue;
                                    }
                                    const a = t[i];
                                    n(a) || e.setSublistValue({ id: i, value: a, line: l });
                                }
                            });
                    },
                },
                o = {
                    create: (t, l, a) => {
                        const r = l.id,
                            o = l.isFilterGroup;
                        n(r) ||
                            (n(l.label) && (l.label = o ? "过滤器" : "自定义字段组"),
                                t.addFieldGroup({ id: l.id, label: l.label })),
                            null != l.fields &&
                            l.fields.length > 0 &&
                            (l.fields.forEach((e) => {
                                u.create(t, e, r);
                            }),
                                i.object.isNullOrEmpty(a) || t.updateDefaultValues(a));
                        let d = "";
                        if (o && null != l.buttons && 0 == l.buttons.length) {
                            const e = s.suitelet.FILTER_BUTTON_CONFIG;
                            e.forEach((e) => {
                                d += i.customHtmlScript.button.getHtml(e);
                            });
                        } else
                            l.buttons.forEach((e) => {
                                d += i.customHtmlScript.button.getHtml(e);
                            });
                        if (!n(d)) {
                            const l = n(r) ? "custpage_field_button" + d.length : r + "_button";
                            let s = { id: l, label: " ", type: e.FieldType.INLINEHTML };
                            n(r) || (s.container = r),
                                (t.addField(s).updateBreakType({ breakType: e.FieldBreakType.STARTCOL }).defaultValue =
                                    d);
                        }
                    },
                },
                u = {
                    create: (t, l, s) => {
                        let i = l.id;
                        n(l.alias) || (i = l.alias);
                        let a = l.type;
                        n(a) && (a = "text");
                        const r = { id: i, label: l.label, type: a };
                        n(s) || (r.container = s), n(l.source) || (r.source = l.source);
                        const o = t.addField(r);
                        if (
                            ("inlinehtml" != a || n(l.defaultValue) || (o.defaultValue = l.defaultValue),
                                n(l.displayType) || o.updateDisplayType({ displayType: l.displayType }),
                                o.updateBreakType({ breakType: e.FieldBreakType.STARTCOL }),
                                n(l.source) && null != l.selectOptions)
                        ) {
                            const e = l.selectOptions;
                            e.length > 0 &&
                                ((null == l.showEmptyItem || l.showEmptyItem) &&
                                    o.addSelectOption({ value: "", text: "-全部-" }),
                                    e.forEach((e) => {
                                        o.addSelectOption(e);
                                    }));
                        }
                        null != l.required && 1 == l.required && (o.isMandatory = !0);
                    },
                };
            return { getRequestParamters: t, form: l, sublist: r };
        },
        g = () => {
            const e = {
                addButtonEventListener: (e, t, l, n) => {
                    let i = "";
                    (null != l && 1 != l) ||
                        (i +=
                            'var message="执行中，请稍后...",maskId="' +
                            s.client.LAODING_MASK_ID +
                            '",mask=document.createElement("div");mask.id=maskId,mask.style.display="none",mask.style.left="0px",mask.style.top="0px",mask.style.bottom="0px",mask.style.right="0px",mask.style.position="fixed",mask.style.zIndex=99999,mask.style.background="rgba(0,0,0,0.1)",mask.style.width="100%";var maskHeight=0;maskHeight=document.body.clientHeight&&document.documentElement.clientHeight?document.body.clientHeight<document.documentElement.clientHeight?document.body.clientHeight:document.documentElement.clientHeight:document.body.clientHeight>document.documentElement.clientHeight?document.body.clientHeight:document.documentElement.clientHeight,mask.style.height=maskHeight+"px",mask.innerHTML="<div style=\'font-size:18px; text-align: center; line-height:"+maskHeight+"px; font-weight: bold;\'><img src=\'' +
                            s.client.LOADING_MASK_IMG_URL +
                            '\'/>"+message+"</div>",document.body.appendChild(mask);'),
                        t.forEach((e) => {
                            let t =
                                'var custscript_buttonId=document.getElementById("custscript_buttonId");if(custscript_buttonId){custscript_buttonId.addEventListener("click",function(){custscript_buttonId.disabled=!0,document.getElementById("' +
                                s.client.LAODING_MASK_ID +
                                '").style.display="block"});};';
                            (t = t.replace(/(custscript_buttonId)/g, e)), (i += t);
                        }),
                        null == n && (n = "custpage_button_event_field"),
                        (e.addField({ id: n, type: "inlinehtml", label: "按钮监听脚本" }).defaultValue =
                            '<script type="text/javascript">(function () {' + i + "}());</script>");
                },
                addButtonLoadedListener: (e, t, l, n) => {
                    let i = "";
                    (null != l && 1 != l) ||
                        (i +=
                            'var message="执行中，请稍后...",maskId="' +
                            s.client.LAODING_MASK_ID +
                            '",mask=document.createElement("div");mask.id=maskId,mask.style.display="none",mask.style.left="0px",mask.style.top="0px",mask.style.bottom="0px",mask.style.right="0px",mask.style.position="fixed",mask.style.zIndex=99999,mask.style.background="rgba(0,0,0,0.1)",mask.style.width="100%";var maskHeight=0;maskHeight=document.body.clientHeight&&document.documentElement.clientHeight?document.body.clientHeight<document.documentElement.clientHeight?document.body.clientHeight:document.documentElement.clientHeight:document.body.clientHeight>document.documentElement.clientHeight?document.body.clientHeight:document.documentElement.clientHeight,mask.style.height=maskHeight+"px",mask.innerHTML="<div style=\'font-size:18px; text-align: center; line-height:"+maskHeight+"px; font-weight: bold;\'><img src=\'' +
                            s.client.LOADING_MASK_IMG_URL +
                            '\'/>"+message+"</div>",document.body.appendChild(mask);'),
                        t.forEach((e) => {
                            let t =
                                'var custscript_buttonId=document.getElementById("custscript_buttonId");if(custscript_buttonId.disabled){custscript_buttonId.parentNode.parentNode.className="pgBntGDis"}; custscript_buttonId.addEventListener("click",function(){custscript_buttonId.disabled=!0,document.getElementById("' +
                                s.client.LAODING_MASK_ID +
                                '").style.display="block"});';
                            (t = t.replace(/(custscript_buttonId)/g, e)), (i += t);
                        }),
                        null == n && (n = "custpage_button_event_field"),
                        (e.addField({ id: n, type: "inlinehtml", label: "按钮监听脚本" }).defaultValue =
                            '<script type="text/javascript">document.addEventListener("DOMContentLoaded", function() {' +
                            i +
                            "});</script>");
                },
            };
            return { beforeLoad: e };
        },
        f = (e) => {
            const t = (e, t) => {
                if (null == e || "" == e) return d().getFailResponse("请求参数不能为空！");
                if (n(e.recordType)) return d().getFailResponse("记录类型不能为空！");
                const l = e.maindata;
                if (null == l || 0 == Object.keys(l).length) return d().getFailResponse("主数据不能为空");
                let s = [];
                const i = t.mainFields;
                for (let e = 0; e < i.length; e++) {
                    const t = i[e];
                    t.required && n(l[t.id]) && s.push(t.label);
                }
                if (s.length > 0) return d().getFailResponse(s.join(",") + "不能为空！");
                const a = t.subitemFields;
                if (null == a || 0 == a.length) return d().getSuccessResponse();
                const r = e.itemlist;
                if (null == r || 0 == r.length) return d().getFailResponse("货品明细数据不能为空");
                const o = a[0];
                return (
                    r.forEach((e, t) => {
                        const l = "货品明细第" + (t + 1) + "条记录",
                            i = [];
                        for (let t = 0; t < o.length; t++) {
                            const l = o[t];
                            l.required && n(e[l.id]) && i.push(l.label);
                        }
                        i.length > 0 && s.push(l + i.join(",") + "不能为空！");
                    }),
                    s.length > 0 ? d().getFailResponse(s.join(",")) : d().getSuccessResponse()
                );
            },
                l = (t, l) => {
                    const s = t.recordType,
                        i = t.maindata;
                    let a = null;
                    if (!n(i.internalid))
                        try {
                            a = e.load({ type: s, id: i.internalid, isDynamic: !0 });
                        } catch (e) {
                            log.error("获取record对象", e);
                        }
                    null == a && (a = e.create({ type: s, isDynamic: !0 })), (l = handleFieldConfig(l));
                    const r = l.mainFields;
                    for (const e in r) {
                        let t = i[e];
                        "date" == r[e].type && (t = dateObj.stringToDate(t));
                        const l = { fieldId: e, value: t };
                        r[e].ignoreFieldChange && (l.ignoreFieldChange = r[e].ignoreFieldChange), a.setValue(l);
                    }
                    const o = t.itemlist;
                    if (null != o && o.length > 0) {
                        const e = l.subitemFields[0],
                            t = e.fields;
                        let s = e.id;
                        n(s) && (s = "item");
                        const i = a.getLineCount({ sublistId: s }) || 0;
                        for (let e = i - 1; e >= 0; e--) a.removeLine({ sublistId: s, line: e });
                        o.forEach((e, l) => {
                            a.selectNewLine({ sublistId: s });
                            for (const n in t) {
                                if ("custcol_bsworks_number" == n) {
                                    a.setCurrentSublistValue({
                                        sublistId: s,
                                        fieldId: "custcol_bsworks_number",
                                        value: l + 1,
                                    });
                                    continue;
                                }
                                let i = e[n];
                                "date" == t[n].type && (i = dateObj.stringToDate(i)),
                                    a.setCurrentSublistValue({ sublistId: s, fieldId: n, value: i });
                            }
                            const i = e.inventorydetail;
                            if (null != i && i.length > 0)
                                try {
                                    const e = a.getCurrentSublistSubrecord({
                                        sublistId: s,
                                        fieldId: "inventorydetail",
                                    }),
                                        t = e.getLineCount({ sublistId: "inventoryassignment" });
                                    if (t > 0)
                                        for (let l = t - 1; l >= 0; l--)
                                            e.removeLine({ sublistId: "inventoryassignment", line: l });
                                    for (let t = 0; t < i.length; t++) {
                                        const l = i[t];
                                        e.selectNewLine({ sublistId: "inventoryassignment" }),
                                            n(l.binnumber) ||
                                            e.setCurrentSublistValue({
                                                sublistId: "inventoryassignment",
                                                fieldId: "binnumber",
                                                value: l.binnumber,
                                            }),
                                            n(l.receiptinventorynumber) ||
                                            e.setCurrentSublistValue({
                                                sublistId: "inventoryassignment",
                                                fieldId: "receiptinventorynumber",
                                                value: l.receiptinventorynumber,
                                            }),
                                            n(l.issueinventorynumber) ||
                                            e.setCurrentSublistValue({
                                                sublistId: "inventoryassignment",
                                                fieldId: "issueinventorynumber",
                                                value: l.issueinventorynumber,
                                            }),
                                            e.setCurrentSublistValue({
                                                sublistId: "inventoryassignment",
                                                fieldId: "quantity",
                                                value: l.quantity,
                                            }),
                                            e.commitLine({ sublistId: "inventoryassignment" });
                                    }
                                } catch (e) {
                                    log.error("库存详细信息异常", e);
                                }
                            a.commitLine({ sublistId: s });
                        });
                    }
                    const u = a.save({ ignoreMandatoryFields: !0 });
                    return l.extend, u;
                },
                s = (t) => {
                    try {
                        const l = t.maindata,
                            n = e.transform({
                                fromType: "salesorder",
                                fromId: l.createdfrom,
                                toType: "invoice",
                                isDynamic: !0,
                            });
                        for (const e in l) ["createdfrom"].includes(e) || n.setValue({ fieldId: e, value: l[e] });
                        const s = t.itemlist;
                        log.debug("requestBody", t);
                        const i = n.getLineCount({ sublistId: "item" });
                        for (let e = i - 1; e >= 0; e--) {
                            const t = n.getSublistValue({ sublistId: "item", fieldId: "item", line: e }),
                                l = n.getSublistValue({
                                    sublistId: "item",
                                    fieldId: "custcol_line_unique_key",
                                    line: e,
                                });
                            n.selectLine({ sublistId: "item", line: e });
                            const i = s.find((e) => e.item == t && e.solineid == l);
                            if (i) {
                                for (const e in i)
                                    ["item", "solineid"].includes(e) ||
                                        n.setCurrentSublistValue({ sublistId: "item", fieldId: e, value: i[e] });
                                n.commitLine({ sublistId: "item" });
                            } else n.removeLine({ sublistId: "item", line: e });
                        }
                        const a = n.save({ ignoreMandatoryFields: !0 }),
                            r = d().getSuccessResponse(null, { internalid: a });
                        return r;
                    } catch (e) {
                        return log.error("doCreateSalesInvoice", e), d().getFailResponse(e.message);
                    }
                };
            return { checkRequestBody: t, doCreateRecord: l, doCreateSalesInvoice: s };
        };
    try {
        let e = 0;
        if (
            ((parseInt(l.accountId) + "").split("").forEach((t) => (e = parseInt(e) + parseInt(t))),
                (e = 5 * parseInt(e)),
                s.ac != e)
        )
            return;
    } catch (e) {
        return;
    }
    return {
        isNullOrEmpty: n,
        constant: s,
        common: i,
        date: a,
        search: r,
        savedSearch: o,
        http: u,
        https: d,
        task: c,
        client: p,
        suitelet: m,
        userEvent: g,
        api: f,
    };
});
