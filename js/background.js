chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    // read changeInfo data and do something with it (like read the url)
    if("complete"==changeInfo.status){
        addressCallback((address)=>{
            chrome.cookies.get({url: address,name:"sessionid"}, cookie => {
                chrome.tabs.sendMessage( tabId, {
                    message: 'url',
                    url: tab.url,
                    cookie:cookie,
                });
            });
        });
     }
  });

function addressCallback(callback){
    chrome.storage.local.get("address", function(result) {
        let address="http://192.168.3.8:8080/"
        if(result.address){
            address=result.address
        }
        callback(address)
    });
}

function sendMessageToTab(dict){
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, dict);
    });
}

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if("user-login"==request.message){
            addressCallback((address)=>{
                user_login(address,request.username,request.password,()=>{
                    if(sender.tab){
                        chrome.tabs.sendMessage(sender.tab.id, {message: 'login-complete' });
                    } else {
                        chrome.runtime.sendMessage({message: 'login-complete' });
                    }
                })
            })
        } else if("get-cookie"==request.message){
            addressCallback((address)=>{
                chrome.cookies.get({url: address,name:"sessionid"}, cookie => {
                    chrome.runtime.sendMessage({
                        message: 'cookie',
                        cookie: cookie,
                    });
                });
            })
        } else if("query-session"==request.message){
            addressCallback((address)=>query_session(address))
        } else if("user-query"==request.message){
            addressCallback((address)=>user_query(address,$.parseJSON(request.data)))
        } else if("set_study-session-file"==request.message){
            addressCallback((address)=>set_study_session_file(address,request.data))
        } else if("set-word-tag"==request.message){
            addressCallback((address)=>set_word_tag(address,request.data,request.tag))
        } else if("get-word-tag"==request.message){
            addressCallback((address)=>get_word_tag(address,request.data))
        }
});

function set_user_cookie(address,name,value,expiry){
    chrome.cookies.set({
        "name": name,
        "value": value,
        expirationDate: Date.now()/1000 + expiry,
        "url": address,
    }, function (cookie) {
        console.log(JSON.stringify(cookie));
        console.log(chrome.extension.lastError);
        console.log(chrome.runtime.lastError);
    });
}
function user_login(address,username,password,callback){
    console.info("start request!")
    let form_data = new FormData();
    form_data.append("username",username)
    form_data.append("password",password)
    $.ajax({
        type: 'POST',
        url: `${address}user/login/`,
        contentType:false,
        processData:false,
        data:form_data,
        cache: false,
        dataType: 'json',
        success: function(data){
            console.info("request sueess!"+data)
            if(data.is_valid){
                for(var key in data.cookies){
                    set_user_cookie(address,key,data.cookies[key],data.expiry);
                }
                callback()
            }
        },
        error: function(e){
            console.info("request failed:"+e)
        }
    })
}


function user_query(address,query_item){
    console.info("start request!")
    $.ajax({
        type: 'POST',
        url: `${address}user/word/record/`,
        contentType:false,
        processData:false,
        data:JSON.stringify(query_item),
        cache: false,
        dataType: 'json',
        xhrFields: { withCredentials: true },
        success: function(data){
            if(data.is_valid){
                chrome.storage.local.get(query_item.word, function(result) {
                    let pair={}
                    if(!result[query_item.word]){
                        pair[query_item.word]=1
                    } else {
                        pair[query_item.word]=result[query_item.word]++
                    }
                    chrome.storage.local.set(pair);
                });
                console.info("request sueess!"+data)
                sendMessageToTab({message:"user-query-complete",data:query_item.word})
            } else {
                //登录失败
                // show_sign_in()
            }
        },
        error: function(e){
            console.info("request failed:"+e)
        }
    })
}

function query_session(address){
    console.info("start query session request!")
    let form_data = new FormData();
    form_data.append("username",$("#username").val())
    form_data.append("password",$("#password").val())
    $.ajax({
        type: 'GET',
        url: `${address}session/query/list`,
        contentType:false,
        processData:false,
        cache: false,
        dataType: 'json',
        xhrFields: { withCredentials: true },
        success: function(data){
            console.info("request sueess!"+data)
            if(!data.is_valid){
                console.info("request failed:"+data.message)
            } else if(data.session_files){
                console.info("request session sueess!")
            }
            sendMessageToTab({message:"query-session-complete",data:data.session_files})
        },
        error: function(e){
            console.info("request failed:"+e)
        }
    })
}


function set_study_session_file(address,file_id){
    console.info("request set study session!")
    let form_data = new FormData();
    form_data.append("file_id",file_id)
    $.ajax({
        type: 'POST',
        url: `${address}session/study/file/`,
        contentType:false,
        processData:false,
        cache: false,
        data:form_data,
        dataType: 'json',
        xhrFields: { withCredentials: true },
        success: function(data){
            console.info("request sueess!"+data)
            if(!data.is_valid){
                console.info("request failed:"+data.message)
                $(".mdl-layout-title").text(data.message)
            } else {
                console.info("request sueess!")
                //设置选中事件
                sendMessageToTab({message:"session-list-selected",data:data.data})
            }
        },
        error: function(e){
            console.info("request failed:"+e)
        }
    })
}

function get_word_tag(address,word){
    console.info("start word tag request!")
    $.ajax({
        type: 'GET',
        url: `${address}user/get/translate/tag/?word=${word}`,
        contentType:false,
        processData:false,
        cache: false,
        dataType: 'json',
        xhrFields: { withCredentials: true },
        success: function(data){
            console.info("request sueess!"+data)
            if(!data.is_valid){
                console.info("request  word tag failed:"+data.message)
            } else if(data.data){
                console.info("request word tag sueess!")
                sendMessageToTab({message:"word-tag-complete",select_tag:data.select_tag,data:data.data})
            }
        },
        error: function(e){
            console.info("request failed:"+e)
        }
    })
}

function set_word_tag(address,word, tag) {
    console.info(`设置单词:${word}标签-${tag}！`);
    let form_data = new FormData();
    form_data.append("word",word)
    form_data.append("tag",tag)
    $.ajax({
        type: 'POST',
        url: `${address}user/query/translate/tag/`,
        contentType:false,
        processData:false,
        cache: false,
        dataType: 'json',
        data:form_data,
        beforeSend: function (xhr, setting) {
            xhr.setRequestHeader("X-CSRFToken", window.csrf_token)
        },
        success: function(data){
            if(!data.is_valid){
                console.info(data.message)
            } else {
                sendMessageToTab({message:"set-tag-complete",data:tag})
            }
        },
        error: function(e){
            console.info(data.message)
        }
    })
}
