
Skip to content

    Pull requests
    Issues
    Marketplace
    Explore

    @rathovarun

11
8

    11

Percona-Lab/codeceptjs-resemblehelper
Code
Issues 7
Pull requests 4
Projects 0
Wiki
Insights
codeceptjs-resemblehelper/index.js
@puneet0191 puneet0191 Compatibility with Webdriver @5 08b9c84 on Feb 12
@puneet0191
@mathesouza
240 lines (213 sloc) 7.94 KB
'use strict';

// use any assertion library you like
const resemble = require("resemblejs");
const fs = require('fs');
let assert = require('assert');
const mkdirp = require('mkdirp');
const getDirName = require('path').dirname;

/**
 * Resemble.js helper class for CodeceptJS, this allows screen comparison
 * @author Puneet Kala
 */

class ResembleHelper extends Helper {

    constructor(config) {
        super(config);
    }

    /**
     * Compare Images
     * @param image1
     * @param image2
     * @param diffImage
     * @param options
     * @returns {Promise<any | never>}
     */
    async _compareImages (image1, image2, diffImage, options) {
        image1 = this.config.baseFolder + image1;
        image2 = this.config.screenshotFolder + image2;
        if(typeof this.config.consoleOutput == 'undefined')
        {
            this.config.consoleOutput = true
        }
        return new Promise((resolve, reject) => {
            if (options.boundingBox !== undefined)
            {
                resemble.outputSettings({
                    boundingBox: options.boundingBox
                });
            }

            if (options.tolerance !== undefined)
            {
                if(this.config.consoleOutput){
                    console.log("Tolerance Level Provided " + options.tolerance);
                }
                var tolerance = options.tolerance;
            }
            resemble.compare(image1, image2, options, (err, data) => {        
                if (err) {
                    reject(err);
                } else {         
                    resolve(data);
                    if (data.misMatchPercentage >= tolerance) {
                        mkdirp(getDirName(this.config.diffFolder + diffImage), function (err) {
                            if (err) return cb(err);
                        });
                        fs.writeFile(this.config.diffFolder + diffImage + '.png', data.getBuffer(), (err, data) => {
                            if (err) {
                                throw new Error(this.err);
                            }
                        });
                    }
                }
            });
        }).catch((error) => {
            console.log('caught', error.message);
        });
    }

    /**
     *
     * @param image1
     * @param options
     * @returns {Promise<*>}
     */
    async _fetchMisMatchPercentage (image1, options) {
        var image2 = image1;
        var diffImage = "Diff_" + image1.split(".")[0];
        var result = this._compareImages(image1, image2, diffImage, options);
        var data = await Promise.resolve(result);
        return data.misMatchPercentage;
    }

    /**
     * Check Visual Difference for Base and Screenshot Image
     * @param baseImage         Name of the Base Image (Base Image path is taken from Configuration)
     * @param options           Options ex {prepareBaseImage: true, tolerance: 5} along with Resemble JS Options, read more here: https://github.com/rsmbl/Resemble.js
     * @returns {Promise<void>}
     */
    async seeVisualDiff(baseImage, options) {
        if (options == undefined)
        {
            options = {};
            options.tolerance = 0;
        }

        if (options.prepareBaseImage !== undefined && options.prepareBaseImage)
        {
            await this._prepareBaseImage(baseImage);
        }

        var misMatch = await this._fetchMisMatchPercentage(baseImage, options);
        if(this.config.consoleOutput){
            console.log("MisMatch Percentage Calculated is " + misMatch);
        }
        assert(misMatch <= options.tolerance, "MissMatch Percentage " + misMatch);
    }

    /**
     * See Visual Diff for an Element on a Page
     *
     * @param selector   Selector which has to be compared expects these -> CSS|XPath|ID
     * @param baseImage  Base Image for comparison
     * @param options    Options ex {prepareBaseImage: true, tolerance: 5} along with Resemble JS Options, read more here: https://github.com/rsmbl/Resemble.js
     * @returns {Promise<void>}
     */
    async seeVisualDiffForElement(selector, baseImage, options){

        if (selector !== undefined)
        {
            if (options == undefined)
            {
                options = {};
                options.tolerance = 0;
            }

            if (options.prepareBaseImage !== undefined && options.prepareBaseImage)
            {
                await this._prepareBaseImage(baseImage);
            }

            options.boundingBox = await this._getBoundingBox(selector);
            var misMatch = await this._fetchMisMatchPercentage(baseImage, options);
            if(this.config.consoleOutput)
            {
                console.log("MisMatch Percentage Calculated is " + misMatch);
            }
            assert(misMatch <= options.tolerance, "MissMatch Percentage " + misMatch);
        }
        else {
            return null;
        }
    }

    /**
     * Function to prepare Base Images from Screenshots
     *
     * @param screenShotImage  Name of the screenshot Image (Screenshot Image Path is taken from Configuration)
     */
    async _prepareBaseImage(screenShotImage) {
        var configuration = this.config;

        await this._createDir(configuration.baseFolder + screenShotImage);

        fs.access(configuration.screenshotFolder + screenShotImage, fs.constants.F_OK | fs.constants.W_OK, (err) => {
            if (err) {
                console.error(
                    `${configuration.screenshotFolder + screenShotImage} ${err.code === 'ENOENT' ? 'does not exist' : 'is read-only'}`);
            }
        });

        fs.access(configuration.baseFolder, fs.constants.F_OK | fs.constants.W_OK, (err) => {
            if (err) {
                console.error(
                    `${configuration.baseFolder} ${err.code === 'ENOENT' ? 'does not exist' : 'is read-only'}`);
            }
        });

        fs.copyFileSync(configuration.screenshotFolder + screenShotImage, configuration.baseFolder + screenShotImage);
    }

    /**
     * Function to create Directory
     * @param directory
     * @returns {Promise<void>}
     * @private
     */
    async _createDir (directory) {
        mkdirp.sync(getDirName(directory));
    }

    /**
     * Function to fetch Bounding box for an element, fetched using selector
     *
     * @param selector CSS|XPath|ID selector
     * @returns {Promise<{boundingBox: {left: *, top: *, right: *, bottom: *}}>}
     */
    async _getBoundingBox(selector)
{
        const browser = this._getBrowser();
        if(this.helpers['Puppeteer']){
         const page= await browser.defaultBrowserContext();
         const ele= await page.$(selector);
         var location = await ele.getLocation();
         var size = await ele.getSize();
        }
        else  {
           try {
               await page.waitForSelector(selector);
               var location = await page.getLocation(selector);
            var size = await page.getElementSize(selector);
              }
         catch (error) 
         {
           console.log("The element didn't appear.");
           return null;
          }
            }
         


        if (this.helpers['WebDriver']) {
            const ele = await browser.$(selector);
            var location = await ele.getLocation();
            var size = await ele.getSize();
        }
        else {
            var ele = await browser.element(selector)
                .then((res) => {
                    return res;
                })
                .catch((err) => {
                    // Catch the error because webdriver.io throws if the element could not be found
                    // Source: https://github.com/webdriverio/webdriverio/blob/master/lib/protocol/element.js
                    return null;
                });
            var location = await browser.getLocation(selector);
            var size = await browser.getElementSize(selector);
        }

        var bottom = size.height + location.y;
        var right = size.width + location.x;
        var boundingBox = {
            left: location.x,
            top: location.y,
            right: right,
            bottom: bottom
        };

        return boundingBox;
    }

    _getBrowser() {
        if (this.helpers['WebDriver']) {
            return this.helpers['WebDriver'].browser;
        }
        if (this.helpers['Appium']) {
            return this.helpers['Appium'].browser;
        }
        if (this.helpers['WebDriverIO']) {
            return this.helpers['WebDriverIO'].browser;
        }
        if (this.helpers['Puppeteer']) {
            return this.helpers['Puppeteer'].browser;
        }
        

        throw new Error('No matching helper found. Supported helpers: WebDriver/Appium/WebDriverIO');
    }
}

module.exports = ResembleHelper;



