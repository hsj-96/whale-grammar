import styleCloneAttributes from "./clone.styles";

export function renderMirrorElement() {
	const mirrorEl = document.createElement(`grammar-mirror`);
	mirrorEl.dataset.generated = `whale-grammar`;

	return mirrorEl;
}

function cloneElementStyles(targetEl, mirrorEl) {
	const computedStyles = window.getComputedStyle(targetEl);
	styleCloneAttributes.forEach(e => {
		const style = computedStyles.getPropertyValue(`${e}`);
		if(style.length > 0) {
			mirrorEl.setStyle(e, style);
		}
	});
}
function attachStyleObserver(targetEl, mirrorEl, extensionEl) {
	const observer = new window.MutationObserver(mutation => {
		let isStyleChanged = false;
		mutation.forEach(e => {
			if(e.attributeName === `style`) {
				isStyleChanged = true;
			}
		});

		if(isStyleChanged) {
			cloneElementStyles(targetEl, mirrorEl);
			extensionEl.setSizePosition(targetEl);

			const { positionList } = mirrorEl.measureTextPositions();
			extensionEl.addUnderlines(positionList);
		}
	});

	observer.observe(targetEl, {
		attributes: true
	});

	return observer;
}
function onTextAreaChanged(mirrorEl, extensionEl, port) {
	let timeout;
	return function(e) {
		const { value } = e.target;
		mirrorEl.setText(value);

		clearTimeout(timeout);
		if(!value) {
			extensionEl.reset();
			return;
		}

		const { scrollTop, scrollLeft } = mirrorEl.getScrollPosition();
		const { positionList, missingIndexList } = mirrorEl.measureTextPositions();
		extensionEl.modifyUnderlines(positionList, missingIndexList, { scrollTop, scrollLeft });

		extensionEl.setDotStatus({ status: `loading` });
		timeout = window.setTimeout(function() {
			port.postMessage({
				action: `inspectContent`,
				options: { text: value }
			});
		}, 1600);
	}
}
function onTextAreaScrolled(mirrorEl, extensionEl) {
	return function(e) {
		mirrorEl.setScrollPosition(e.target);

		const { scrollTop, scrollLeft } = mirrorEl.getScrollPosition();
		const { positionList, missingIndexList } = mirrorEl.measureTextPositions();
		extensionEl.modifyUnderlines(positionList, missingIndexList, { scrollTop, scrollLeft });
	}
}
function firstTextInspection(targetEl, mirrorEl, extensionEl, port) {
	const { value } = targetEl;
	mirrorEl.setText(value);

	if(!value) {
		extensionEl.resetUnderlines();
		return;
	}

	extensionEl.setDotStatus({ status: `loading` });
	port.postMessage({
		action: `inspectContent`,
		options: { text: value }
	});
}
export function onTextAreaFocused({activeEl, mirrorEl, extensionEl, port}) {
	mirrorEl.reset();
	mirrorEl.setScrollPosition(activeEl);

	cloneElementStyles(activeEl, mirrorEl);
	firstTextInspection(activeEl, mirrorEl, extensionEl, port);

	const styleObserver = attachStyleObserver(activeEl, mirrorEl, extensionEl);
	const inputEventListener = onTextAreaChanged(mirrorEl, extensionEl, port);
	const scrollEventListener = onTextAreaScrolled(mirrorEl, extensionEl);
	activeEl.addEventListener(`input`, inputEventListener);
	activeEl.addEventListener(`scroll`, scrollEventListener);
	activeEl.spellcheck = false;

	return { styleObserver, inputEventListener, scrollEventListener };
}

function onEditableChanged(mirrorEl, extensionEl, port) {
	let timeout;
	return function(e) {
		const { innerText, innerHTML } = e.target;
		mirrorEl.setHTML(innerHTML);

		clearTimeout(timeout);
		if(!innerText) {
			extensionEl.reset();
			return;
		}
		//
		// const { positionList, missingIndexList } = mirrorEl.measureTextPositions();
		// extensionEl.modifyUnderlines(positionList, missingIndexList);
		//
		// extensionEl.setDotStatus({ status: `loading` });
		// timeout = window.setTimeout(function() {
		// 	port.postMessage({
		// 		action: `inspectContent`,
		// 		options: { text: value }
		// 	});
		// }, 1600);
	};
}
function firstElementInspection(targetEl, mirrorEl, extensionEl, port) {
	const { innerText, innerHTML } = targetEl;
	if(!innerText) {
		extensionEl.resetUnderlines();
		mirrorEl.setText(``);

		return;
	}

	mirrorEl.setHTML(innerHTML);
	// extensionEl.setDotStatus({ status: `loading` });
	// port.postMessage({
	// 	action: `inspectContent`,
	// 	options: { text: value }
	// });
}
export function onEditableElementFocused({ activeEl, mirrorEl, extensionEl, port }) {
	mirrorEl.reset();
	cloneElementStyles(activeEl, mirrorEl);
	firstElementInspection(activeEl, mirrorEl, extensionEl, port);

	const styleObserver = attachStyleObserver(activeEl, mirrorEl, extensionEl);
	const inputEventListener = onEditableChanged(mirrorEl, extensionEl, port);
	activeEl.addEventListener(`input`, inputEventListener);
	activeEl.spellcheck = false;

	return { styleObserver, inputEventListener };
}