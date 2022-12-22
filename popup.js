const hoverDelay = document.getElementById('hoverDelay');
const switchEnable = document.getElementById('switchEnable');
const SwitchGap = document.getElementById('SwitchGap');
const submitButton = document.getElementById('submitButton');
const error = document.getElementById('error');
const success = document.getElementById('success');

chrome.storage.sync.get(
    ["autoSwitchTime", "autoSwitchEnable", "hoverDisplayDelay"],
    (items) => {
        let initialSetting = new Object();
        if(!items.autoSwitchTime)
            items.autoSwitchTime = initialSetting.autoSwitchTime = 2;
        if(items.autoSwitchEnable === null || items.autoSwitchEnable === undefined)
            items.autoSwitchEnable = initialSetting.autoSwitchEnable = true;
        if(!items.hoverDisplayDelay)
            items.hoverDisplayDelay = initialSetting.hoverDisplayDelay = 0.5;
        if(Object.keys(items).length)
            chrome.storage.sync.set(initialSetting);
        
        hoverDelay.value = items.hoverDisplayDelay;
        switchEnable.checked = items.autoSwitchEnable;
        SwitchGap.value = items.autoSwitchTime;
        
        if(switchEnable.checked)
            SwitchGap.parentElement.classList.remove('hide');
});

switchEnable.addEventListener('change', (e) => {
    if(!e.target.checked)
        SwitchGap.parentElement.classList.add('hide');
    else
        SwitchGap.parentElement.classList.remove('hide');
})

submitButton.addEventListener('click', (e) => {
    e.stopPropagation();
    let newSetting = new Object();
    if(switchEnable.checked && SwitchGap.value > 30)
    {
        error.parentElement.classList.add('active');
        error.innerText = "间隔时长最高为30秒";
        return;
    }
    if(switchEnable.checked && SwitchGap.value < 0.1)
    {
        error.parentElement.classList.add('active');
        error.innerText = "间隔时长最低为0.1秒";
        return;
    }
    if(hoverDelay.value > 5)
    {
        error.parentElement.classList.add('active');
        error.innerText = "悬浮延迟最高为5秒";
        return;
    }
    if(hoverDelay.value < 0.1)
    {
        error.parentElement.classList.add('active');
        error.innerText = "悬浮延迟最低为0.1秒";
        return;
    }

    newSetting.autoSwitchEnable = switchEnable.checked;
    newSetting.hoverDisplayDelay = hoverDelay.value;
    if(switchEnable.checked)
        newSetting.autoSwitchTime = SwitchGap.value;

    chrome.storage.sync.set(newSetting, () => {
        success.parentElement.classList.add('active');
        success.innerText = "保存成功";
    });

    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, "updated")
            .catch(err => {
                if(!err.message.includes('Receiving end does not exist'))
                    console.log(err);
            });
    });
});

document.addEventListener('click', () => {
    if(error.parentElement.classList.contains('active'))
    {
        error.parentElement.classList.remove('active');
        error.innerText = '';
        success.innerText = '';
    }
});