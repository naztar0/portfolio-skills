const random = (min: number, max: number, round = false) => {
  const value = Math.random() * (max - min) + min;
  return round ? Math.round(value) : value;
};

export class Sky {
  private readonly SVG_CLOUDS_COUNT = 10;
  private readonly IMG_CLOUDS_COUNT = 10;
  private readonly imgSrc = '/images/cloud.webp';
  private readonly sky: HTMLDivElement;
  private readonly svg: SVGSVGElement;
  private readonly background: HTMLDivElement;
  private readonly loader: HTMLDivElement;
  private readonly loaderBar: HTMLDivElement;
  private readonly clouds: HTMLDivElement[] = [];

  constructor() {
    this.sky = document.createElement('div');
    this.sky.classList.add('sky');
    this.background = document.createElement('div');
    this.background.classList.add('background');
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.loader = document.createElement('div');
    this.loader.classList.add('loader-container');
    this.loaderBar = document.createElement('div');
    this.loaderBar.classList.add('loader-bar');
    this.sky.appendChild(this.background);
    this.sky.appendChild(this.svg);
    this.sky.appendChild(this.loader);
  };

  public start() {
    this.generateClouds();
    this.initLoader();
  };

  public finish() {
    this.loader.ontransitionend = () => this.loader.remove();
    this.loader.classList.add('out');
    this.background.classList.add('out');
    this.clouds.forEach((cloud) => {
      cloud.style.animation = 'none';
      setTimeout(() => cloud.style.transform = cloud.style.getPropertyValue('--translateX'), 100);
    });
  };

  public updateLoader(progress: number) {
    this.loaderBar.style.width = `${progress}%`;
  };

  private initLoader() {
    const texts = ['Dispersing clouds', 'Landing', 'Falling'];
    const loaderText = document.createElement('h2');
    loaderText.textContent = texts[Math.floor(Math.random() * texts.length)] + '...';
    const loaderBox = document.createElement('div');
    loaderBox.classList.add('loader-box');
    const loaderOutline = document.createElement('div');
    loaderOutline.classList.add('loader-outline');
    loaderBox.appendChild(this.loaderBar);
    loaderBox.appendChild(loaderOutline);
    this.loader.appendChild(loaderText);
    this.loader.appendChild(loaderBox);
  };

  private generateClouds() {
    for (let i = 0; i < this.SVG_CLOUDS_COUNT; i++) {
      const cloud = this.generateCloudSVG(i);
      this.clouds.push(cloud);
      this.sky.appendChild(cloud);
      const filter = this.generateFilter(i);
      this.svg.appendChild(filter);

      cloud.ontransitionend = () => {
        cloud.remove();
        filter.remove();
        if (this.sky.children.length === 2) {
          this.sky.remove();
        }
      }
    }
    for (let i = 0; i < this.IMG_CLOUDS_COUNT; i++) {
      const cloud = this.generateCloudIMG();
      this.clouds.push(cloud);
      this.sky.appendChild(cloud);

      cloud.ontransitionend = () => {
        cloud.remove();
        if (this.sky.children.length === 2) {
          this.sky.remove();
        }
      }
    }
    document.body.appendChild(this.sky);
  };

  private generateCloudIMG() {
    const box = {
      x: random(-window.innerWidth / 4, window.innerWidth / 6 * 5),
      y: random(-window.innerHeight / 4, window.innerHeight / 4 * 3),
    };
    const animationDuration = random(2, 4);
    const cloud = document.createElement('img');
    cloud.classList.add('cloud');
    cloud.style.transitionDuration = `${animationDuration}s`;
    cloud.style.animationDuration = `${animationDuration}s`;
    cloud.style.animationDelay = `${random(0, 1)}s`;
    cloud.src = this.imgSrc;
    cloud.style.left = `${box.x}px`;
    cloud.style.top = `${box.y}px`;
    cloud.style.setProperty('--translateX',`translateX(${box.x > window.innerWidth / 2 ?
      window.innerWidth - box.x + window.innerWidth / 100 * 75 + 10 :
      -box.x - window.innerWidth / 100 * 75 - 10}px)`);
    return cloud;
  };

  private generateCloudSVG(n: number) {
    const value = random(200, 255);
    const boxShadow = {
      x: 0,
      y: 0,
      blur: random(window.innerWidth / 30, window.innerWidth / 10),
      spread: random(window.innerWidth / 10, window.innerWidth / 7),
      color: `rgba(${value},${value},${value},${random(0.7, 1)})`,
    };

    if (n < this.SVG_CLOUDS_COUNT / 2) {
      boxShadow.x = random(0, window.innerWidth / 6 + boxShadow.spread);
      boxShadow.y = n * window.innerHeight / (this.SVG_CLOUDS_COUNT / 2);
    } else {
      boxShadow.x = random(window.innerWidth - window.innerWidth / 6 - boxShadow.spread, window.innerWidth);
      boxShadow.y = (n - this.SVG_CLOUDS_COUNT / 2) * window.innerHeight / (this.SVG_CLOUDS_COUNT / 2);
    }

    const animationDuration = random(2, 4);

    const cloud = document.createElement('div');
    cloud.classList.add('cloud');
    cloud.id = `cloud-${n}`;
    cloud.style.filter = `url(#filter-${n})`;
    cloud.style.boxShadow = `${boxShadow.x}px ${boxShadow.y}px ${boxShadow.blur}px ${boxShadow.spread}px ${boxShadow.color}`;
    cloud.style.transitionDuration = `${animationDuration}s`;
    cloud.style.animationDuration = `${animationDuration}s`;
    cloud.style.animationDelay = `${random(0, 1)}s`;
    cloud.style.setProperty('--translateX',`translateX(${boxShadow.x > window.innerWidth / 2 ?
      window.innerWidth - boxShadow.x + boxShadow.blur + boxShadow.spread + 10 :
      -boxShadow.x - boxShadow.blur - boxShadow.spread - 10}px)`);

    return cloud;
  };

  private generateFilter(n: number) {
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.id = `filter-${n}`;

    const turbulence = document.createElementNS('http://www.w3.org/2000/svg', 'feTurbulence');
    turbulence.setAttribute('type', 'fractalNoise');
    turbulence.setAttribute('baseFrequency', '0.012');
    turbulence.setAttribute('numOctaves', random(3, 4, true).toString());
    turbulence.setAttribute('seed', random(0, 100, true).toString());

    const displacementMap = document.createElementNS('http://www.w3.org/2000/svg', 'feDisplacementMap');
    displacementMap.setAttribute('in', 'SourceGraphic');
    displacementMap.setAttribute('scale', random(window.innerWidth / 13, window.innerWidth / 6).toString());

    filter.appendChild(turbulence);
    filter.appendChild(displacementMap);

    return filter;
  };
}