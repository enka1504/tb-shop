import '@shopify/ui-extensions/preact';
import {render} from "preact";

export default async () => {
  render(<Extension />, document.body)
}

function Extension() {
  return (
    <s-banner>
      <s-text>
        {shopify.i18n.translate("earnPoints")}
      </s-text>
    </s-banner>
  );
}