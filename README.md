# Lightning Invoice Decoder Javascript
Decodes lightning invoices to show public info - Javascript utility you can import into react or other js files.  

Shout out to Andre Neves who is the real genius here.  This repository is an adaptation of his code at https://lightningdecoder.com/.  Changes I made:
- Stripped away the html. This is just a javascript file you can import into your projects. 
- Insead of using `throw` all errors are simply added to an array that is returned with the invoice decoded.
- If there are errors decoding the invoice amount I simply return zero.  

## How to Use This File

You can save the javascript file and import the decoder function. Here is a snapshot of an example. 

```

/* eslint-disable camelcase */
import React, { Component } from 'react';
import { decode } from '../utility/DecodeLightningPayment';
const exampleInvoiceThousandSats = 'lnbc10u1psn3nujpp54a0jdwrasvellvwnwp6qjy8czdqm2vwph5vfjjcdcnnpfrqcwxgqdqh23jhxapqv3jkxmmyv4ezqvgcqzpgxqyz5vqsp5fqhhqajcl2ya3x9aqrqsx82q6rnn0rd200s4ekl85rtk6mxgwt4q9qyyssq2yzflm27h60fjrzqa06n3hfjmq24gflc89ynm93qmnz7j7zuyz98s9esh8y6ur0ku97h8420k33etj94nw8hx7jh9gv5tajdmt80prspfq3zlk';

class App extends Component {
  componentDidMount() {
    const result = decode(exampleInvoiceThousandSats);
    const {
      errors,
      data,
      human_readable_part,
    } = result;
    const {
      signature,
      signing_data,
      tags,
      time_stamp,
    } = data;
    const { amount, prefix } = human_readable_part;
    console.log('errors', errors); // an array of strings
    console.log('signature', signature); // an object
    console.log('signing_data', signing_data); // a string
    console.log('tags', tags); // an array of objects
    console.log('time_stamp', time_stamp); // number
    console.log('amount', amount); // number - divide by 1000 to get sats
    console.log('prefix', prefix);// string
  }

  render() {
    return (<React.Fragment>
      <h1>Render whatever you want here</h1>
    </React.Fragment>)
  }
}
export default App;


```

You can look more into Andre Neve's original code at his github repository here: https://github.com/andrerfneves/lightning-decoder
