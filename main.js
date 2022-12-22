const previewOffset = {
    x: 30,
    y: -10
};

const extractInfo = (content) => {
    const tagsElement = content.querySelectorAll('#content > div')[0]
                               .getElementsByClassName('tag');
    let tags = [];
    for(const tag of tagsElement)
        tags.push(tag.text);

    const imgsElement = content.querySelectorAll('#images img');
    let images = [];
    for(const image of imgsElement)
        if(image.getAttribute('src')) images.push(image.src);

    return {
        tags,
        images
    };
}

const createElement = ({tags, images}) => {
    const main = document.createElement('div');
    const imageDiv = document.createElement('div');
    const tagsDiv = document.createElement('div');
    for(let i = 0; i < images.length; ++i)
    {
        const image = document.createElement('img');
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
    return main;
}

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
                const raw = await fetch(link.href);
                const content = await raw.text();
                const Parser = new DOMParser();
                const page = Parser.parseFromString(content, 'text/html');;

                const info = extractInfo(page);
                const element = createElement(info);

                const x = getMouseX();
                const y = getMouseY();

                if(y > 2 * innerHeight / 3)
                    element.style.bottom = innerHeight - (y - previewOffset.y) + "px";
                else if(y < innerHeight / 3)
                    element.style.top = y + previewOffset.y + "px";
                else
                    element.style.top = y - 150 + "px";

                element.style.left = x + previewOffset.x + "px";

                document.body.appendChild(element);
            }, 500);
        });

        link.addEventListener('mousemove', (e) => {
            const preview = document.getElementById('contentPreview');
            if(!preview) return;

            const x = e.clientX;
            //const y = e.clientY;

            preview.style.left = x + previewOffset.x + "px";
            //preview.style.top = y + previewOffset.y + "px";
        });

        link.addEventListener('mouseleave', (e) => {
            clearTimeout(timer);
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
    if(name === 'ArrowRight')
        nextIndex = (index === (images.length - 1 )) ? 0 : (index + 1);
    if(name === 'ArrowLeft')
        nextIndex = (index === 0) ? (images.length - 1) : (index - 1);

    images[nextIndex].classList.add('active');
    preview.querySelector('div:nth-child(1) p').innerText = `< ${nextIndex + 1}/${images.length} >`;
});