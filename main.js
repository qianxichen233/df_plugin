let autoSwitchTime = 2000;
let autoSwitchEnable = true;
let hoverDisplayDelay = 500;

const previewOffset = {
    x: 30,
    y: -10
};

const previewMargin = 10;

const updateOption = () => {
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
            
            hoverDisplayDelay = items.hoverDisplayDelay * 1000;
            autoSwitchEnable = items.autoSwitchEnable;
            autoSwitchTime = items.autoSwitchTime * 1000;
    });
};
updateOption();

chrome.runtime.onMessage.addListener(msg => {
    if(msg === 'updated')
        updateOption();
});

let SwitchIntervalIdentifier;
let focusedLink;

const checkCursorInside = (ele) => {
    const rect = ele.getBoundingClientRect();
    const cursorX = getMouseX();
    const cursorY = getMouseY();
    if(cursorX >= rect.left && cursorX <= rect.right &&
       cursorY >= rect.top && cursorY <= rect.bottom)
        return true;
    return false;
}

const extractInfo = (html) => {
    const tagsElement = html.querySelectorAll('#content > div')[0]
                               .getElementsByClassName('tag');
    let tags = [];
    for(const tag of tagsElement)
        tags.push(tag.text);

    const imgsElement = html.querySelectorAll('#images img');
    let images = [];
    for(const image of imgsElement)
        if(image.getAttribute('src')) images.push(image.src);

    return {
        tags,
        images
    };
}

const switchImage = (type, preview) => {
    const images = preview.querySelectorAll('img');
    if(images.length <= 1) return;

    let index;
    for(let i = 0; i < images.length; ++i)
    {
        if(images[i].classList.contains('active'))
        {
            index = i;
            images[i].classList.remove('active');
        }
    }
    
    let nextIndex;
    if(type === 'ArrowRight')
        nextIndex = (index === (images.length - 1 )) ? 0 : (index + 1);
    if(type === 'ArrowLeft')
        nextIndex = (index === 0) ? (images.length - 1) : (index - 1);

    images[nextIndex].classList.add('active');
    preview.querySelector('div:nth-child(1) p').innerText = `< ${nextIndex + 1}/${images.length} >`;
}

const createElement = ({tags, images}) => {
    const main = document.createElement('div');
    const imageDiv = document.createElement('div');
    const tagsDiv = document.createElement('div');

    let callback;
    main.style.visibility = 'hidden';

    for(let i = 0; i < images.length; ++i)
    {
        const image = document.createElement('img');
        image.onload = (e) => {
            if(!e.target.classList.contains('active')) return;
            const rect = main.getBoundingClientRect();
            if(rect.top < previewMargin)
                main.style.top = '10px';
            else if(rect.bottom > innerHeight - previewMargin)
            {
                main.style.removeProperty('top');
                main.style.bottom = previewMargin;
            }
            main.style.visibility = 'visible';
            if(!autoSwitchEnable) return;
            SwitchIntervalIdentifier = setInterval(() => {
                switchImage('ArrowRight', main);
            }, autoSwitchTime);
        }
        image.src = images[i];
        if(i === 0) image.className = "active";
        
        imageDiv.appendChild(image);
    }
    if(!images.length)
    {
        const noImg = document.createElement('span');
        noImg.innerText = "No Preview Image";
        imageDiv.appendChild(noImg);
        imageDiv.className = "noImg";

        callback = (main) => {
            const rect = main.getBoundingClientRect();
            if(rect.top < previewMargin)
                main.style.top = '10px';
            else if(rect.bottom > innerHeight - previewMargin)
            {
                main.style.removeProperty('top');
                main.style.bottom = previewMargin;
            }
            main.style.visibility = 'visible';
        }
    }
    else
    {
        const imgPage = document.createElement('p');
        imgPage.innerText = `< 1/${images.length} >`;
        imageDiv.appendChild(imgPage);
    }

    for(const tag of tags)
    {
        const tagElement = document.createElement('p');
        tagElement.innerHTML = tag;
        tagElement.className = 'tag';
        tagsDiv.appendChild(tagElement);
    }
    if(!tags.length)
    {
        const noTag = document.createElement('p');
        noTag.innerText = "No Tags Yet";
        noTag.className = 'noTag';
        tagsDiv.appendChild(noTag);
    }

    main.id = 'contentPreview';
    main.appendChild(imageDiv);
    main.appendChild(tagsDiv);

    return {
        element: main,
        callback
    };
}

const possibleContainers = ["tablesorter", 'gamelist'];

let gameList;
for(container of possibleContainers)
{
    gameList = document.querySelector(`.${container} > tbody`)?.children;
    if(gameList) break;
}

if(gameList)
{
    for(let i = 0; i < gameList.length; ++i)
    {
        let timer;
        const link = gameList[i].querySelector('a');
        if(!link) continue;
        
        link.addEventListener('mouseover', (e) => {
            timer = setTimeout(async () => {
                focusedLink = link;
                const raw = await fetch(link.href);
                const content = await raw.text();
                const Parser = new DOMParser();
                const page = Parser.parseFromString(content, 'text/html');;

                const info = extractInfo(page);
                const {element, callback} = createElement(info);

                const x = getMouseX();
                const y = getMouseY();

                element.style.left = x + previewOffset.x + "px";
                element.style.top = y + previewOffset.y + "px";

                if(!checkCursorInside(link)) return;
                document.body.appendChild(element);
                if(callback) callback(element);
            }, hoverDisplayDelay);
        });

        link.addEventListener('mousemove', (e) => {
            const preview = document.getElementById('contentPreview');
            if(!preview) return;

            const x = e.clientX;

            preview.style.left = x + previewOffset.x + "px";
        });

        link.addEventListener('mouseleave', (e) => {
            focusedLink = null;
            clearTimeout(timer);
            if(SwitchIntervalIdentifier)
            {
                clearInterval(SwitchIntervalIdentifier);
                SwitchIntervalIdentifier = null;
            }
            const preview = document.getElementById('contentPreview');
            if(preview) preview.remove();
        })
    }
}

document.addEventListener('keydown', (e) => {
    const name = e.key;
    if(name !== 'ArrowLeft' && name !== 'ArrowRight') return;

    const preview = document.getElementById('contentPreview');
    if(!preview) return;

    switchImage(name, preview);
    if(SwitchIntervalIdentifier)
    {
        clearInterval(SwitchIntervalIdentifier);
        SwitchIntervalIdentifier = setInterval(() => {
            switchImage('ArrowRight', preview);
        }, autoSwitchTime);
    }
});

document.addEventListener('scroll', () => {
    const preview = document.getElementById('contentPreview');
    if(!preview || !focusedLink) return;
    if(!checkCursorInside(focusedLink)) preview.remove();
});

let cursor_x = null;
let cursor_y = null;
    
const onMouseUpdate = (e) => {
    cursor_x = e.clientX;
    cursor_y = e.clientY;
}

const getMouseX = () => {
    return cursor_x;
}

const getMouseY = () => {
    return cursor_y;
}
    
document.addEventListener('mousemove', onMouseUpdate, false);
document.addEventListener('mouseenter', onMouseUpdate, false);