import {registerMessageHandler, MessageType} from "../dist";

registerMessageHandler((m, cb) => {

  cb(null, {
    result: 'a',
    type: MessageType.DONE_AND_RETURN_TO_POOL
  })

});

