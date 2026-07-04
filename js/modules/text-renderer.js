/**
 * Text renderer module.
 *
 * Encapsulates the card's text layout and drawing logic. The main public
 * interface is createTextRenderer(options), which returns an object with a
 * single method: writeText(textObject, targetContext).
 *
 * Pure string helpers (curlyQuotes, pinlineColors) are defined at the top
 * level so they can be exercised without a DOM.
 */

function curlyQuotes(input) {
	return input.replace(/ '/g, ' ‘').replace(/^'/, '‘').replace(/'/g, '’').replace(/ "/g, ' “').replace(/" /g, '” ').replace(/\."/, '.”').replace(/"$/, '”').replace(/"\)/g, '”)').replace(/"/g, '“');
}

function pinlineColors(color) {
	return color.replace('white', '#fcfeff').replace('blue', '#0075be').replace('black', '#272624').replace('red', '#ef3827').replace('green', '#007b43');
}

function createTextRenderer(options) {
	const {
		scaleX,
		scaleY,
		scaleWidth,
		scaleHeight,
		getManaSymbol,
		getInlineCardName,
		getCard,
		querySelector,
		params,
		document,
		prePTContext
	} = options;

	// Internal scratch canvases used for paragraph and line layout.
	const paragraphCanvas = document.createElement('canvas');
	const paragraphContext = paragraphCanvas.getContext('2d');
	const lineCanvas = document.createElement('canvas');
	const lineContext = lineCanvas.getContext('2d');

	// Module-local state that used to be global.
	let justifyWidth = 90;
	let maxSpaceSize = 3;
	let minSpaceSize = 0.5;
	let savedTextXPosition = 0;
	let savedTextXPosition2 = 0;

	const FILL = 0;
	const STROKE = 1;
	const MEASURE = 2;

	// -------------------------------------------------------------------------
	// Canvas text helpers (previously CanvasRenderingContext2D.prototype methods)
	// -------------------------------------------------------------------------

	function fillTextArc(ctx, text, x, y, radius, startRotation, distance = 0, outlineWidth = 0) {
		ctx.save();
		ctx.translate(x - distance + scaleWidth(0.5), y + radius);
		ctx.rotate(startRotation + widthToAngle(distance, radius));
		for (var i = 0; i < text.length; i++) {
			var letter = text[i];
			if (outlineWidth >= 1) {
				ctx.strokeText(letter, 0, -radius);
			}
			ctx.fillText(letter, 0, -radius);
			ctx.rotate(widthToAngle(ctx.measureText(letter).width, radius));
		}
		ctx.restore();
	}

	function drawImageArc(ctx, image, x, y, width, height, radius, startRotation, distance = 0) {
		ctx.save();
		ctx.translate(x - distance + scaleWidth(0.5), y + radius);
		ctx.rotate(startRotation + widthToAngle(distance, radius));
		ctx.drawImage(image, 0, -radius, width, height);
		ctx.restore();
	}

	function fillImage(ctx, image, x, y, width, height, color = 'white', margin = 10) {
		var canvas = document.createElement('canvas');
		canvas.width = width + margin * 2;
		canvas.height = height + margin * 2;
		var context = canvas.getContext('2d');
		context.drawImage(image, margin, margin, width, height);
		context.globalCompositeOperation = 'source-in';
		context.fillStyle = pinlineColors(color);
		context.fillRect(0, 0, width + margin * 2, height + margin * 2);
		ctx.drawImage(canvas, x - margin, y - margin, width + margin * 2, height + margin * 2);
	}

	function fillJustifyText(ctx, text, x, y, width, settings) {
		justifiedTextSettings(settings);
		renderTextJustified(ctx, text, x, y, width, FILL);
	}

	function strokeJustifyText(ctx, text, x, y, width, settings) {
		justifiedTextSettings(settings);
		renderTextJustified(ctx, text, x, y, width, STROKE);
	}

	function measureJustifiedText(ctx, text, width, settings) {
		justifiedTextSettings(settings);
		return renderTextJustified(ctx, text, 0, 0, width, MEASURE);
	}

	function renderTextJustified(ctx, text, x, y, width, renderType) {
		var splitChar = " ";

		var words, wordsWidth, count, spaces, spaceWidth, adjSpace, renderer, i, textAlign, useSize, totalWidth;
		textAlign = ctx.textAlign;
		ctx.textAlign = "left";
		wordsWidth = 0;
		words = text.split(splitChar).map(word => {
			var w = ctx.measureText(word).width;
			wordsWidth += w;
			return {
				width: w,
				word: word
			};
		});
		count = words.length;
		spaces = count - 1;
		spaceWidth = ctx.measureText(splitChar).width;
		adjSpace = Math.max(spaceWidth * minSpaceSize, (width - wordsWidth) / spaces);
		useSize = adjSpace > spaceWidth * maxSpaceSize ? spaceWidth : adjSpace;
		totalWidth = wordsWidth + useSize * spaces;
		if (renderType === MEASURE) {
			ctx.textAlign = textAlign;
			return totalWidth;
		}
		renderer = renderType === FILL ? ctx.fillText.bind(ctx) : ctx.strokeText.bind(ctx);
		switch(textAlign) {
		case "right":
			x -= totalWidth;
			break;
		case "end":
			x += width - totalWidth;
			break;
		case "center":
			x -= totalWidth / 2;
		default:
		}
		if (useSize === spaceWidth) {
			renderer(text, x, y);
		} else {
			for(i = 0; i < count; i += 1) {
				renderer(words[i].word, x, y);
				x += words[i].width;
				x += useSize;
			}
		}
		ctx.textAlign = textAlign;
	}

	function justifiedTextSettings(settings) {
		var min, max;
		var vetNumber = (num, defaultNum) => {
			num = num !== null && num !== null && !isNaN(num) ? num : defaultNum;
			if (num < 0) {
				num = defaultNum;
			}
			return num;
		};
		if (settings === undefined || settings === null) {
			return;
		}
		max = vetNumber(settings.maxSpaceSize, maxSpaceSize);
		min = vetNumber(settings.minSpaceSize, minSpaceSize);
		if (min > max) {
			return;
		}
		minSpaceSize = min;
		maxSpaceSize = max;
	}

	function widthToAngle(width, radius) {
		return width / radius;
	}

	// -------------------------------------------------------------------------
	// Public interface
	// -------------------------------------------------------------------------

	async function writeText(textObject, targetContext) {
		const card = getCard();

		// Used by callers (drawText / drawFrames) to coordinate roll-text layers.
		let drawTextBetweenFrames = false;
		let redrawFrames = false;

		// Per-call state
		let savedRollYPosition = null;
		let savedFont = null;

		var textX = scaleX(textObject.x) || scaleX(0);
		var textY = scaleY(textObject.y) || scaleY(0);
		var textWidth = scaleWidth(textObject.width) || scaleWidth(1);
		var textHeight = scaleHeight(textObject.height) || scaleHeight(1);
		var startingTextSize = scaleHeight(textObject.size) || scaleHeight(0.038);
		var textFontHeightRatio = 0.7;
		var textBounded = textObject.bounded || true;
		var textOneLine = textObject.oneLine || false;
		var textManaCost = textObject.manaCost || false;
		var textAllCaps = textObject.allCaps || false;
		var textManaSpacing = scaleWidth(textObject.manaSpacing) || 0;
		var canvasMargin = 300;
		paragraphCanvas.width = textWidth + 2 * canvasMargin;
		paragraphCanvas.height = textHeight + 2 * canvasMargin;
		lineCanvas.width = textWidth + 2 * canvasMargin;
		lineCanvas.height = startingTextSize + 2 * canvasMargin;
		var splitString = '6GJt7eL8';
		var rawText = textObject.text;

		if (querySelector('#hide-reminder-text').checked && textObject.name && textObject.name != 'Title' && textObject.name != 'Type' && textObject.name != 'Mana Cost' && textObject.name != 'Power/Toughness') {
			var rulesText = rawText;
			var flavorText = '';
			var flavorIndex = rawText.indexOf('{flavor}') || rawText.indexOf('///');
			if (flavorIndex >= 0) {
				flavorText = rawText.substring(flavorIndex);
				rulesText = rawText.substring(0, flavorIndex);
			}
			rulesText = rulesText.replace(/ ?{i}\([^\)]+\){\/i}/g, '');
			rawText = rulesText + flavorText;
		}
		if (textAllCaps) {
			rawText = rawText.toUpperCase();
		}
		if ((textObject.name == 'wizards' || textObject.name == 'copyright') && params.get('copyright') != null && (params.get('copyright') != '' || card.margins)) {
			rawText = params.get('copyright');
			if (rawText == 'none') { rawText = ''; }
		}
		if (rawText.toLowerCase().includes('{cardname}') || rawText.toLowerCase().includes('~')) {
			rawText = rawText.replace(/{cardname}|~/ig, getInlineCardName());
		}
		if (querySelector('#info-artist').value == '') {
			rawText = rawText.replace('\uFFEE{savex2}{elemidinfo-artist}', '');
		}
		if (rawText.includes('///')) {
			rawText = rawText.replace(/\/\/\//g, '{flavor}');
		}
		if (rawText.includes('//')) {
			rawText = rawText.replace(/\/\//g, '{lns}');
		}

		if (card.version == 'pokemon') {
			rawText = rawText.replace(/{flavor}/g, '{oldflavor}{fontsize-20}{fontgillsansbolditalic}');
		} else if (card.version == 'dossier') {
			rawText = rawText.replace(/{flavor}(.*)/g, function(v) { return '{/indent}{lns}{bar}{lns}{fixtextalign}' + v.replace(/{flavor}/g, '').toUpperCase(); });
		} else if (!card.showsFlavorBar) {
			rawText = rawText.replace(/{flavor}/g, '{oldflavor}');
		}

		if (textObject.font == 'saloongirl') {
			rawText = rawText.replace(/\*/g, '{fontbelerenbsc}*{fontsaloongirl}');
		}
		rawText = rawText.replace(/ - /g, ' — ');
		var splitText = rawText.replace(/\n/g, '{line}').replace(/{-}/g, '\u2014').replace(/{divider}/g, '{/indent}{lns}{bar}{lns}{fixtextalign}');
		if (rawText.trim().startsWith('{flavor}') || rawText.trim().startsWith('{oldflavor}')) {
			splitText = splitText.replace(/{flavor}/g, '{i}').replace(/{oldflavor}/g, '{i}');
		} else {
			splitText = splitText.replace(/{flavor}/g, '{/indent}{lns}{bar}{lns}{fixtextalign}{i}').replace(/{oldflavor}/g, '{/indent}{lns}{lns}{up30}{i}');
		}
		splitText = splitText.replace(/{/g, splitString + '{').replace(/}/g, '}' + splitString).replace(/ /g, splitString + ' ' + splitString).split(splitString);

		splitText = splitText.filter(item => item);
		if (textObject.manaCost) {
			splitText = splitText.filter(item => item != ' ');
		}
		if (textObject.vertical) {
			var newSplitText = [];
			splitText.forEach((item, index) => {
				if (item.includes('{') && item.includes('}')) {
					newSplitText.push(item);
				} else if (item == ' ') {
					newSplitText.push(`{down${scaleHeight(0.01)}}`);
				} else {
					item.split('').forEach(char => {
						if (char == '’') {
							newSplitText.push(`{right${startingTextSize * 0.6}}`, '’', '{lns}', `{up${startingTextSize * 0.75}}`);
						} else if (textManaCost && index == splitText.length-1) {
							newSplitText.push(char);
						} else {
							newSplitText.push(char, '{lns}');
						}
					});
				}
			});
			splitText = newSplitText;
		}
		splitText.push('');

		var drawingText = true;
		outerloop: while (drawingText) {
			var textColor = textObject.color || 'black';
			var textFont = textObject.font || 'mplantin';
			var textAlign = textObject.align || 'left';
			var textJustify = textObject.justify || 'left';
			var textShadowColor = textObject.shadow || 'black';
			var textShadowOffsetX = scaleWidth(textObject.shadowX) || 0;
			var textShadowOffsetY = scaleHeight(textObject.shadowY) || 0;
			var textShadowBlur = scaleHeight(textObject.shadowBlur) || 0;
			var textArcRadius = scaleHeight(textObject.arcRadius) || 0;
			var manaSymbolColor = textObject.manaSymbolColor || null;
			var textRotation = textObject.rotation || 0;
			if (textArcRadius > 0) {
				canvasMargin = 300 + textArcRadius;
				paragraphCanvas.width = textWidth + 2 * canvasMargin;
				paragraphCanvas.height = textHeight + 2 * canvasMargin;
				lineCanvas.width = textWidth + 2 * canvasMargin;
				lineCanvas.height = startingTextSize + 2 * canvasMargin;
			}
			var textArcStart = textObject.arcStart || 0;
			var currentX = 0;
			var startingCurrentX = 0;
			var currentY = 0;
			var lineY = 0;
			var newLine = false;
			var textFontExtension = '';
			var textFontStyle = textObject.fontStyle || '';
			var manaPlacementCounter = 0;
			var realTextAlign = textAlign;
			savedRollYPosition = null;
			var savedRollColor = 'black';
			var drawToPrePTCanvas = false;
			var widestLineWidth = 0;
			var textSize = startingTextSize;
			var newLineSpacing = (textObject.lineSpacing || 0) * textSize;
			var ptShift = [0, 0];
			var permaShift = [0, 0];
			var fillJustify = false;

			paragraphContext.clearRect(0, 0, paragraphCanvas.width, paragraphCanvas.height);
			lineContext.clearRect(0, 0, lineCanvas.width, lineCanvas.height);
			lineContext.letterSpacing = (scaleWidth(textObject.kerning) || 0) + 'px';
			textSize += parseInt(textObject.fontSize || '0');
			lineContext.font = textFontStyle + textSize + 'px ' + textFont + textFontExtension;
			lineContext.fillStyle = textColor;
			lineContext.shadowColor = textShadowColor;
			lineContext.shadowOffsetX = textShadowOffsetX;
			lineContext.shadowOffsetY = textShadowOffsetY;
			lineContext.shadowBlur = textShadowBlur;
			lineContext.strokeStyle = textObject.outlineColor || 'black';
			var textOutlineWidth = scaleHeight(textObject.outlineWidth) || 0;

			var hideBottomInfoBorder = card.hideBottomInfoBorder || false;
			if (hideBottomInfoBorder && ['midLeft', 'topLeft', 'note', 'bottomLeft', 'wizards', 'bottomRight', 'rarity'].includes(textObject.name)) {
				textOutlineWidth = 0;
			}
			lineContext.lineWidth = textOutlineWidth;

			innerloop: for (var word of splitText) {
				var wordToWrite = word;
				if ((wordToWrite.includes('{') && wordToWrite.includes('}')) || textManaCost || savedFont) {
					var possibleCode = wordToWrite.toLowerCase().replace('{', '').replace('}', '');
					wordToWrite = null;
					if (possibleCode == 'line') {
						newLine = true;
						startingCurrentX = 0;
						newLineSpacing = textSize * 0.35;
					} else if (possibleCode == 'lns' || possibleCode == 'linenospace') {
						newLine = true;
					} else if (possibleCode == 'bar') {
						var barWidth = textWidth * 0.96;
						var barHeight = scaleHeight(0.03);
						var barImageName = 'bar';
						var barDistance = 0;
						realTextAlign = textAlign;
						textAlign = 'left';
						if (card.version == 'cartoony') {
							barImageName = 'cflavor';
							barWidth = scaleWidth(0.8547);
							barHeight = scaleHeight(0.0458);
							barDistance = -0.23;
							newLineSpacing = textSize * -0.23;
							textSize -= scaleHeight(0.0086);
						}
						lineContext.drawImage(getManaSymbol(barImageName).image, canvasMargin + (textWidth - barWidth) / 2, canvasMargin + barDistance * textSize, barWidth, barHeight);
					} else if (possibleCode == 'i') {
						if (textFont == 'gilllsans' || textFont == 'neosans') {
							textFontExtension = 'italic';
						} else if (textFont == 'mplantin') {
							textFontExtension = 'i';
							textFontStyle = textFontStyle.replace('italic ', '');
						} else {
							textFontExtension = '';
							if (!textFontStyle.includes('italic')) { textFontStyle += 'italic '; }
						}
						lineContext.font = textFontStyle + textSize + 'px ' + textFont + textFontExtension;
					} else if (possibleCode == '/i') {
						textFontExtension = '';
						textFontStyle = textFontStyle.replace('italic ', '');
						lineContext.font = textFontStyle + textSize + 'px ' + textFont + textFontExtension;
					} else if (possibleCode == 'bold') {
						if (textFont == 'gillsans') {
							textFontExtension = 'bold';
						} else {
							if (!textFontStyle.includes('bold')) { textFontStyle += 'bold '; }
						}
						lineContext.font = textFontStyle + textSize + 'px ' + textFont + textFontExtension;
					} else if (possibleCode == '/bold') {
						if (textFont == 'gillsans') {
							textFontExtension = '';
						} else {
							textFontStyle = textFontStyle.replace('bold ', '');
						}
						lineContext.font = textFontStyle + textSize + 'px ' + textFont + textFontExtension;
					} else if (possibleCode == 'left') {
						textAlign = 'left';
					} else if (possibleCode == 'center') {
						textAlign = 'center';
					} else if (possibleCode == 'right') {
						textAlign = 'right';
					} else if (possibleCode == 'justify-left') {
						textJustify = 'left';
					} else if (possibleCode == 'justify-center') {
						textJustify = 'center';
					} else if (possibleCode == 'justify-right') {
						textJustify = 'right';
					} else if (possibleCode.includes('conditionalcolor')) {
						var codeParams = possibleCode.split(":");
						for (var eligibleFrame of codeParams[1].split(",")) {
							eligibleFrame = eligibleFrame.replace(/_/g, " ");
							if (card.frames.findIndex(element => element.name.toLowerCase().includes(eligibleFrame)) != -1) {
								textColor = codeParams[2];
								lineContext.fillStyle = textColor;
							}
						}
					} else if (possibleCode.includes('fontcolor')) {
						textColor = possibleCode.replace('fontcolor', '');
						lineContext.fillStyle = textColor;
					} else if (possibleCode.includes('fontsize')) {
						if (possibleCode.slice(-2) === "pt") {
							textSize = (parseInt(possibleCode.replace('fontsize', '').replace('pt', '')) * 600 / 72) || 0;
						} else {
							textSize += parseInt(possibleCode.replace('fontsize', '')) || 0;
						}
						lineContext.font = textFontStyle + textSize + 'px ' + textFont + textFontExtension;
					} else if (possibleCode.includes('font') || savedFont) {
						textFont = word.replace('{font', '').replace('}', '');
						if (savedFont) {
							textFont = savedFont;
							wordToWrite = word;
						}
						textFontExtension = '';
						textFontStyle = '';
						lineContext.font = textFontStyle + textSize + 'px ' + textFont + textFontExtension;
						savedFont = null;
					} else if (possibleCode.includes('outlinecolor')) {
						lineContext.strokeStyle = possibleCode.replace('outlinecolor', '');
					} else if (possibleCode.includes('outline')) {
						textOutlineWidth = parseInt(possibleCode.replace('outline', ''));
						lineContext.lineWidth = textOutlineWidth;
					} else if (possibleCode.includes('upinline')) {
						lineY -= parseInt(possibleCode.replace('upinline', '')) || 0;
					} else if (possibleCode.substring(0, 2) == 'up' && possibleCode != 'up') {
						currentY -= parseInt(possibleCode.replace('up', '')) || 0;
					} else if (possibleCode.includes('down')) {
						currentY += parseInt(possibleCode.replace('down', '')) || 0;
					} else if (possibleCode.includes('left')) {
						currentX -= parseInt(possibleCode.replace('left', '')) || 0;
					} else if (possibleCode.includes('right')) {
						currentX += parseInt(possibleCode.replace('right', '')) || 0;
					} else if (possibleCode.includes('shadow')) {
						if (possibleCode.includes('color')) {
							textShadowColor = possibleCode.replace('shadowcolor', '');
							lineContext.shadowColor = textShadowColor;
						} else if (possibleCode.includes('blur')) {
							textShadowBlur = parseInt(possibleCode.replace('shadowblur', '')) || 0;
							lineContext.shadowBlur = textShadowBlur;
						} else if (possibleCode.includes('shadowx')) {
							textShadowOffsetX = parseInt(possibleCode.replace('shadowx', '')) || 0;
							lineContext.shadowOffsetX = textShadowOffsetX;
						} else if (possibleCode.includes('shadowy')) {
							textShadowOffsetY = parseInt(possibleCode.replace('shadowy', '')) || 0;
							lineContext.shadowOffsetY = textShadowOffsetY;
						} else {
							textShadowOffsetX = parseInt(possibleCode.replace('shadow', '')) || 0;
							textShadowOffsetY = textShadowOffsetX;
							lineContext.shadowOffsetX = textShadowOffsetX;
							lineContext.shadowOffsetY = textShadowOffsetY;
						}
					} else if (possibleCode == 'planechase') {
						var planechaseHeight = textSize * 1.8;
						lineContext.drawImage(getManaSymbol('chaos').image, currentX + canvasMargin, canvasMargin, planechaseHeight * 1.2, planechaseHeight);
						currentX += planechaseHeight * 1.3;
						startingCurrentX += planechaseHeight * 1.3;
					} else if (possibleCode == 'indent') {
						startingCurrentX += currentX;
						currentY -= 10;
					} else if (possibleCode == '/indent') {
						startingCurrentX = 0;
					} else if (possibleCode.includes('elemid')) {
						if (querySelector('#' + word.replace('{elemid', '').replace('}', ''))) {
							wordToWrite = querySelector('#' + word.replace('{elemid', '').replace('}', '')).value || '';
						}
						if (word.includes('set')) {
							var bottomTextSubstring = card.bottomInfo.midLeft.text.substring(0, card.bottomInfo.midLeft.text.indexOf('  {savex}')).replace('{elemidinfo-set}', querySelector('#info-set').value || '').replace('{elemidinfo-language}', querySelector('#info-language').value || '');
							justifyWidth = lineContext.measureText(bottomTextSubstring).width;
						} else if (word.includes('number') && wordToWrite.includes('/') && card.version != 'pokemon') {
							fillJustify = true;
							wordToWrite = Array.from(wordToWrite).join(' ');
						}
					} else if (possibleCode == 'savex') {
						savedTextXPosition = currentX;
					} else if (possibleCode == 'loadx') {
						if (savedTextXPosition > currentX) {
							currentX = savedTextXPosition;
						}
					} else if (possibleCode == 'savex2') {
						savedTextXPosition2 = currentX;
					} else if (possibleCode == 'loadx2') {
						if (savedTextXPosition2 > currentX) {
							currentX = savedTextXPosition2;
						}
					} else if (possibleCode.includes('ptshift')) {
						if (card.frames.findIndex(element => element.name.toLowerCase().includes('power/toughness')) >= 0 || card.version.includes('planeswalker') || ['commanderLegends', 'm21', 'mysticalArchive', 'customDualLands', 'feuerAmeiseKaldheim'].includes(card.version)) {
							ptShift[0] = scaleWidth(parseFloat(possibleCode.replace('ptshift', '').split(',')[0]));
							ptShift[1] = scaleHeight(parseFloat(possibleCode.split(',')[1]));
						}
					} else if (possibleCode.includes('rollcolor')) {
						savedRollColor = possibleCode.replace('rollcolor', '') || 'black';
					} else if (possibleCode.includes('roll')) {
						drawTextBetweenFrames = true;
						redrawFrames = true;
						drawToPrePTCanvas = true;
						if (savedRollYPosition == null) {
							savedRollYPosition = currentY;
						} else {
							savedRollYPosition = -1;
						}
						savedFont = textFont;
						lineContext.font = textFontStyle + textSize + 'px ' + 'belerenb' + textFontExtension;
						wordToWrite = possibleCode.replace('roll', '');
					} else if (possibleCode.includes('permashift')) {
						permaShift = [parseFloat(possibleCode.replace('permashift', '').split(',')[0]), parseFloat(possibleCode.split(',')[1])];
					} else if (possibleCode.includes('arcradius')) {
						textArcRadius = parseInt(possibleCode.replace('arcradius', '')) || 0;
					} else if (possibleCode.includes('arcstart')) {
						textArcStart = parseFloat(possibleCode.replace('arcstart', '')) || 0;
					} else if (possibleCode.includes('rotate')) {
						textRotation = parseInt(possibleCode.replace('rotate', '')) % 360;
					} else if (possibleCode === 'manacolordefault') {
						manaSymbolColor = null;
					} else if (possibleCode.includes('manacolor')) {
						manaSymbolColor = possibleCode.replace('manacolor', '') || 'white';
					} else if (possibleCode.includes('fixtextalign')) {
						textAlign = realTextAlign;
					} else if (possibleCode.includes('kerning')) {
						lineContext.letterSpacing = possibleCode.replace('kerning', '') + 'px';
						lineContext.font = lineContext.font;
					} else if (getManaSymbol(possibleCode.replaceAll('/', '')) != undefined || getManaSymbol(possibleCode.replaceAll('/', '').split('').reverse().join('')) != undefined) {
						possibleCode = possibleCode.replaceAll('/', '');
						var manaSymbol;
						if (textObject.manaPrefix && (getManaSymbol(textObject.manaPrefix + possibleCode) != undefined || getManaSymbol(textObject.manaPrefix + possibleCode.split('').reverse().join('')) != undefined)) {
							manaSymbol = getManaSymbol(textObject.manaPrefix + possibleCode) || getManaSymbol(textObject.manaPrefix + possibleCode.split('').reverse().join(''));
						} else {
							manaSymbol = getManaSymbol(possibleCode) || getManaSymbol(possibleCode.split('').reverse().join(''));
						}

						var origManaSymbolColor = manaSymbolColor;
						if (manaSymbol.matchColor && !manaSymbolColor && textColor !== 'black') {
							manaSymbolColor = textColor;
						}

						var manaSymbolSpacing = textSize * 0.04 + textManaSpacing;
						var manaSymbolWidth = manaSymbol.width * textSize * 0.78;
						var manaSymbolHeight = manaSymbol.height * textSize * 0.78;
						var manaSymbolX = currentX + canvasMargin + manaSymbolSpacing;
						var manaSymbolY = canvasMargin + textSize * 0.34 - manaSymbolHeight / 2;
						if (textObject.manaPlacement) {
							manaSymbolX = scaleWidth(textObject.manaPlacement.x[manaPlacementCounter] || 0) + canvasMargin;
							manaSymbolY = canvasMargin;
							currentY = scaleHeight(textObject.manaPlacement.y[manaPlacementCounter] || 0);
							manaPlacementCounter++;
							newLine = true;
						} else if (textObject.manaLayout) {
							var layoutOption = 0;
							var manaSymbolCount = splitText.length - 1;
							while (textObject.manaLayout[layoutOption].max < manaSymbolCount && layoutOption < textObject.manaLayout.length - 1) {
								layoutOption++;
							}
							var manaLayout = textObject.manaLayout[layoutOption];
							if (manaLayout.pos[manaPlacementCounter] == undefined) {
								manaLayout.pos[manaPlacementCounter] = [0, 0];
							}
							manaSymbolX = scaleWidth(manaLayout.pos[manaPlacementCounter][0] || 0) + canvasMargin;
							manaSymbolY = canvasMargin;
							currentY = scaleHeight(manaLayout.pos[manaPlacementCounter][1] || 0);
							manaPlacementCounter++;
							manaSymbolWidth *= manaLayout.size;
							manaSymbolHeight *= manaLayout.size;
							newLine = true;
						}
						if (textObject.manaImageScale) {
							currentX -= (textObject.manaImageScale - 1) * manaSymbolWidth;
							manaSymbolX -= (textObject.manaImageScale - 1) / 2 * manaSymbolWidth;
							manaSymbolY -= (textObject.manaImageScale - 1) / 2 * manaSymbolHeight;
							manaSymbolWidth *= textObject.manaImageScale;
							manaSymbolHeight *= textObject.manaImageScale;
						}
						var fakeShadow = lineCanvas.cloneNode();
						var fakeShadowContext = fakeShadow.getContext('2d');
						fakeShadowContext.clearRect(0, 0, fakeShadow.width, fakeShadow.height);
						var backImage = null;
						if (manaSymbol.backs) {
							backImage = getManaSymbol('back' + Math.floor(Math.random() * manaSymbol.backs) + manaSymbol.back).image;
						}
						if (textArcRadius > 0) {
							if (manaSymbol.backs) {
								drawImageArc(fakeShadowContext, backImage, manaSymbolX, manaSymbolY, manaSymbolWidth, manaSymbolHeight, textArcRadius, textArcStart, currentX);
							}
							drawImageArc(fakeShadowContext, manaSymbol.image, manaSymbolX, manaSymbolY, manaSymbolWidth, manaSymbolHeight, textArcRadius, textArcStart, currentX);
						} else if (manaSymbolColor) {
							fillImage(fakeShadowContext, manaSymbol.image, manaSymbolX, manaSymbolY, manaSymbolWidth, manaSymbolHeight, manaSymbolColor);
						} else {
							if (manaSymbol.backs) {
								fakeShadowContext.drawImage(backImage, manaSymbolX, manaSymbolY, manaSymbolWidth, manaSymbolHeight);
							}
							fakeShadowContext.drawImage(manaSymbol.image, manaSymbolX, manaSymbolY, manaSymbolWidth, manaSymbolHeight);
						}
						lineContext.drawImage(fakeShadow, 0, 0);
						currentX += manaSymbolWidth + manaSymbolSpacing * 2;

						manaSymbolColor = origManaSymbolColor;
					} else {
						wordToWrite = word;
					}
				}

				if (wordToWrite && lineContext.font.endsWith('belerenb')) {
					wordToWrite = wordToWrite.replace(/f(?:\s|$)/g, '\ue006').replace(/h(?:\s|$)/g, '\ue007').replace(/m(?:\s|$)/g, '\ue008').replace(/n(?:\s|$)/g, '\ue009').replace(/k(?:\s|$)/g, '\ue00a');
				}

				if (wordToWrite && lineContext.measureText(wordToWrite).width + currentX >= textWidth && textArcRadius == 0) {
					if (textOneLine && startingTextSize > 1) {
						startingTextSize -= 1;
						continue outerloop;
					}
					newLine = true;
				}
				if ((newLine && !textOneLine) || splitText.indexOf(word) == splitText.length - 1) {
					var horizontalAdjust = 0;
					if (textAlign == 'center') {
						horizontalAdjust = (textWidth - currentX) / 2;
					} else if (textAlign == 'right') {
						horizontalAdjust = textWidth - currentX;
					}
					if (currentX > widestLineWidth) {
						widestLineWidth = currentX;
					}
					paragraphContext.drawImage(lineCanvas, horizontalAdjust, currentY);
					lineY = 0;
					lineContext.clearRect(0, 0, lineCanvas.width, lineCanvas.height);
					if (savedRollYPosition != null && (newLineSpacing != 0 || !(newLine && !textOneLine))) {
						if (savedRollYPosition != -1) {
							paragraphContext.globalCompositeOperation = 'destination-over';
							paragraphContext.globalAlpha = 0.25;
							paragraphContext.fillStyle = savedRollColor;
							paragraphContext.fillRect(canvasMargin - textSize * 0.1, savedRollYPosition + canvasMargin - textSize * 0.28, paragraphCanvas.width - 2 * canvasMargin + textSize * 0.2, currentY - savedRollYPosition + textSize * 1.3);
							paragraphContext.globalCompositeOperation = 'source-over';
							paragraphContext.globalAlpha = 1;
							savedRollYPosition = -1;
						} else {
							savedRollYPosition = null;
						}
					}
					currentX = startingCurrentX;
					currentY += textSize + newLineSpacing;
					newLineSpacing = (textObject.lineSpacing || 0) * textSize;
					newLine = false;
				}
				if (wordToWrite && (currentX != startingCurrentX || wordToWrite != ' ') && !textManaCost) {
					var justifySettings = {
						maxSpaceSize: 6,
						minSpaceSize: 0
					};

					if (textArcRadius > 0) {
						fillTextArc(lineContext, wordToWrite, currentX + canvasMargin, canvasMargin + textSize * textFontHeightRatio + lineY, textArcRadius, textArcStart, currentX, textOutlineWidth);
					} else {
						if (textOutlineWidth >= 1) {
							if (fillJustify) {
								strokeJustifyText(lineContext, wordToWrite, currentX + canvasMargin, canvasMargin + textSize * textFontHeightRatio + lineY, justifyWidth, justifySettings);
							} else {
								lineContext.strokeText(wordToWrite, currentX + canvasMargin, canvasMargin + textSize * textFontHeightRatio + lineY);
							}
						}
						if (fillJustify) {
							fillJustifyText(lineContext, wordToWrite, currentX + canvasMargin, canvasMargin + textSize * textFontHeightRatio + lineY, justifyWidth, justifySettings);
						} else {
							lineContext.fillText(wordToWrite, currentX + canvasMargin, canvasMargin + textSize * textFontHeightRatio + lineY);
						}
					}

					if (fillJustify) {
						currentX += measureJustifiedText(lineContext, wordToWrite, justifyWidth, justifySettings);
					} else {
						currentX += lineContext.measureText(wordToWrite).width;
					}
				}
				if (currentY > textHeight && textBounded && !textOneLine && startingTextSize > 1 && textArcRadius == 0) {
					startingTextSize -= 1;
					continue outerloop;
				}
				if (splitText.indexOf(word) == splitText.length - 1) {
					var verticalAdjust = 0;
					if (!textObject.noVerticalCenter) {
						verticalAdjust = (textHeight - currentY + textSize * 0.15) / 2;
					}
					var finalHorizontalAdjust = 0;
					const horizontalAdjustUnit = (textWidth - widestLineWidth) / 2;
					if (textJustify == 'right' && textAlign != 'right') {
						finalHorizontalAdjust = 2 * horizontalAdjustUnit;
						if (textAlign == 'center') {
							finalHorizontalAdjust = horizontalAdjustUnit;
						}
					} else if (textJustify == 'center' && textAlign != 'center') {
						finalHorizontalAdjust = horizontalAdjustUnit;
						if (textAlign == 'right') {
							finalHorizontalAdjust = -horizontalAdjustUnit;
						}
					}
					var trueTargetContext = targetContext;
					if (drawToPrePTCanvas) {
						trueTargetContext = prePTContext;
					}
					if (textRotation) {
						trueTargetContext.save();
						const shapeX = textX + ptShift[0];
						const shapeY = textY + ptShift[1];
						trueTargetContext.translate(shapeX, shapeY);
						trueTargetContext.rotate(Math.PI * textRotation / 180);
						trueTargetContext.drawImage(paragraphCanvas, permaShift[0] - canvasMargin + finalHorizontalAdjust, verticalAdjust - canvasMargin + permaShift[1]);
						trueTargetContext.restore();
					} else {
						trueTargetContext.drawImage(paragraphCanvas, textX - canvasMargin + ptShift[0] + permaShift[0] + finalHorizontalAdjust, textY - canvasMargin + verticalAdjust + ptShift[1] + permaShift[1]);
					}
					drawingText = false;
				}
			}
		}

		return { drawTextBetweenFrames, redrawFrames };
	}

	return { writeText };
}