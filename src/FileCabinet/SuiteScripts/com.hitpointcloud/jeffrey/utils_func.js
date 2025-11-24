    /**
     * @NApiVersion 2.1
     * @NModuleScope Public
     *
     */
    define(['N/record', 'N/search','N/format','N/error'],
        function (record, search,format,error) {
            function getAllSearchData(searchObj) {
                var run_search = searchObj.run();
                var all_data = run_search.getRange({start: 0, end: 1000});
                var data_i = 1000;
                while (all_data) {
                    if (all_data.length == data_i) {
                        var to_data_ex = run_search.getRange({start: data_i, end: data_i + 1000});
                        if (to_data_ex.length > 0) {
                            all_data = all_data.concat(to_data_ex);
                        }
                        data_i = data_i + 1000;
                    } else {
                        break;
                    }
                }
                return all_data;
            }

            function timestampToTime() {
                var now = new Date();
                var moffset = now.getTimezoneOffset();
                var now = new Date(now.getTime() + ((8 * 60 + moffset) * 60 * 1000));
                var t = new Date(now.getTime() + (0 * 60 * 60 * 1000) - 28800000);

                var year = t.getFullYear();
                var month = t.getMonth() + 1;
                var day = t.getDate();
                var hour = t.getHours();
                var minute = t.getMinutes();
                var second = t.getSeconds();

                month = month < 10 ? '0' + month : month;
                day = day < 10 ? '0' + day : day;
                hour = hour < 10 ? '0' + hour : hour;
                minute = minute < 10 ? '0' + minute : minute;
                second = second < 10 ? '0' + second : second;
                var date = year + '-' + month + '-' + day; //+'// '+hour+':'+minute;//+':'+second;

                return date;
            }

            function accMul(arg1, arg2) {
                var m = 0, s1 = arg1.toString(), s2 = arg2.toString();
                try { m += s1.split(".")[1].length } catch (e) { }
                try { m += s2.split(".")[1].length } catch (e) { }
                return Number(s1.replace(".", "")) * Number(s2.replace(".", "")) / Math.pow(10, m)
            }

            function accDiv(arg1, arg2) {
                var t1 = 0, t2 = 0, r1, r2;
                try { t1 = arg1.toString().split(".")[1].length } catch (e) { }
                try { t2 = arg2.toString().split(".")[1].length } catch (e) { }
                with (Math) {
                    r1 = Number(arg1.toString().replace(".", ""))
                    r2 = Number(arg2.toString().replace(".", ""))
                    return (r1 / r2) * pow(10, t2 - t1);
                }
            }

            function accAdd(arg1, arg2) {
                var r1, r2, m, c;
                try {
                    r1 = arg1.toString().split(".")[1].length
                } catch (e) {
                    r1 = 0
                }
                try {
                    r2 = arg2.toString().split(".")[1].length
                } catch (e) {
                    r2 = 0
                }
                c = Math.abs(r1 - r2);
                m = Math.pow(10, Math.max(r1, r2))
                if (c > 0) {
                    var cm = Math.pow(10, c);
                    if (r1 > r2) {
                        arg1 = Number(arg1.toString().replace(".", ""));
                        arg2 = Number(arg2.toString().replace(".", "")) * cm;
                    } else {
                        arg1 = Number(arg1.toString().replace(".", "")) * cm;
                        arg2 = Number(arg2.toString().replace(".", ""));
                    }
                } else {
                    arg1 = Number(arg1.toString().replace(".", ""));
                    arg2 = Number(arg2.toString().replace(".", ""));
                }
                return (arg1 + arg2) / m
            }

            function accMinus(arg1,arg2){
                var r1,r2,m;
                try {
                    r1=arg1.toString().split(".")[1].length
                } catch(e) {
                    r1=0
                }
                try {
                    r2=arg2.toString().split(".")[1].length
                } catch(e) {
                    r2=0
                }
                m = Math.pow(10,Math.max(r1,r2))
                return (arg1 * m - arg2 * m) / m;
            }

            function timestampToTime(d) {
                var now = new Date(d);
                var moffset = now.getTimezoneOffset();
                var now = new Date(now.getTime() + ((8 * 60 + moffset) * 60 * 1000));
                var t = new Date(now.getTime() + (0 * 60 * 60 * 1000));

                var year = t.getFullYear();
                var month = t.getMonth() + 1;
                var day = t.getDate();
                var hour = t.getHours();
                var minute = t.getMinutes();
                var second = t.getSeconds();

                month = month < 10 ? '0' + month : month;
                day = day < 10 ? '0' + day : day;
                hour = hour < 10 ? '0' + hour : hour;
                minute = minute < 10 ? '0' + minute : minute;
                second = second < 10 ? '0' + second : second;

                var date = year + '/' + month + '/' + day ;//+'// '+hour+':'+minute +':'+second;

                return date;
            }

            function timestampToTime2(d) {
                var now = new Date(d);
                var moffset = now.getTimezoneOffset();
                var now = new Date(now.getTime() + ((8 * 60 + moffset) * 60 * 1000));
                var t = new Date(now.getTime() + (0 * 60 * 60 * 1000));

                var year = t.getFullYear();
                var month = t.getMonth() + 1;
                var day = t.getDate();
                var hour = t.getHours();
                var minute = t.getMinutes();
                var second = t.getSeconds();

                month = month < 10 ? '0' + month : month;
                day = day < 10 ? '0' + day : day;
                hour = hour < 10 ? '0' + hour : hour;
                minute = minute < 10 ? '0' + minute : minute;
                second = second < 10 ? '0' + second : second;
                var date = month + '/' + "01" + '/' + year ;//+'// '+hour+':'+minute +':'+second;

                return date;
            }





        return {
            accDiv:accDiv,
            accMul:accMul,
            accAdd:accAdd,
            accMinus:accMinus,
            getAllSearchData:getAllSearchData,
            timestampToTime:timestampToTime,
            timestampToTime2:timestampToTime2
        };

    });