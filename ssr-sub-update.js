const SSH_OPTION = {
  host: '',
  username: '',
  password: '',
  // script: '',
};
const SUB_PATH = '';

main();

async function main() {
  let oldLen = 0; // 旧 ssr url 数量
  let newLen = 0; // 新 ssr url 数量
  let mergedLen = 0; // 合并后的 ssr url 数量
  let dedupLen = 0; // 去重后的 ssr url 数量
  // 从剪贴板获取文本
  let newText = getSsrFromClipboard();
  // 判断文本类型是否合法，可能是以下三种类型
  // ssr url
  // base64
  // 其他类型文本
  const textType = getTextType(newText);
  switch (textType) {
    case 'ssr':
      break;
    case 'base64':
      newText = base64Decode(newtext);
      break;
    default:
      console.error('invalid clipborad text');
      return;
  }
  // 转数组，顺便过滤掉空行和非 ssr url 行
  const newArr = textToArr(newText);
  newLen = newArr.length;
  if (!newLen) {
    console.log('no ssr urls found');
    return;
  }
  // 连接 ssh
  try {
    console.log('ssh...');
    const {
      session,
      response, // 如果执行了 script
    } = await ssh(SSH_OPTION);
    const {
      connected,
      authorized,
      channel, // 执行 bash
      sftp,
    } = session;
    if (connected && authorized) {
      // 连接 ftp
      console.log('sftp...');
      await sftp.connect();
      // 获取服务器上的旧 subscribe.txt
      const oldBase64 = await getFileContent(sftp, SUB_PATH);
      // base64 解码并转为 ssr url 数组
      const oldArr = textToArr(base64Decode(oldBase64));
      oldLen = oldArr.length;
      // 合并新旧 ssr url 数组
      const mergedArr = oldArr.concat(newArr);
      mergedLen = mergedArr.length;
      // 去重
      const mergedSet = new Set(mergedArr);
      const dedupArr = Array.from(mergedSet);
      dedupLen = dedupArr.length;
      console.log(`${oldLen}+${newLen}=${mergedLen}=>${dedupLen}`);
      // 最终数组转文本并 base64 编码
      const finalBase64 = base64Encode(dedupArr.join('\n'));
      // 备份旧 subcribe.txt
      await backupOld(sftp, SUB_PATH);
      // 上传新 subscribe.txt
      await uploadTxt(sftp, finalBase64, SUB_PATH);
      console.log('done!');
      $ssh.disconnect();
    } else {
      console.error(`connected:${connected}, authorized: ${authorized}`);
    }
  } catch (err) {
    // 1. getFileContent 没有文件时
    // 2. uploadTxt 失败时
    console.error(err);
  }
}

function textToArr(plainText) {
  let arr = plainText.split('\n');
  const droped = [];
  arr = arr.filter((row) => {
    if (row !== '' && row.indexOf('ssr://') === 0) return true;
    droped.push(row);
    return false;
  });
  return arr;
}

function getSsrFromClipboard() {
  if (!$clipboard.items.length) return '';
  const item = $clipboard.items[0];
  let plainText = item['public.plain-text'] || item['public.utf8-plain-text'];
  plainText = typeof plainText === 'object' ? '' : plainText;
  if (plainText.indexOf('ssr://') === -1) return '';
  return plainText;
}

function getTextType(text) {
  if (text.indexOf('ssr://') !== -1) return 'ssr';
  try {
    text = base64Decode(text);
    if (text.indexOf('ssr://') !== -1) return 'base64';
    return '';
  } catch (err) {
    // base64 解析错误
    return '';
  }
}

// ===== ssh =====

function ssh({
  host, username, password, script,
}) {
  return new Promise((resolve) => {
    $ssh.connect({
      host,
      port: 22,
      username,
      password,
      script,
      handler: (session, response) => {
        resolve({
          session,
          response,
        });
      },
    });
  });
}

function backupOld(sftp, src) {
  return new Promise((resolve, reject) => {
    const timestamp = new Date().getTime();
    sftp.moveItem({
      src,
      dest: `${src}.${timestamp}`,
      handler(success) {
        resolve(success);
      },
    });
  });
}

function getFileContent(sftp, path) {
  return new Promise((resolve, reject) => {
    sftp.contents({
      path,
      handler(file) {
        if (file) resolve(file.string);
        else reject();
      },
    });
  });
}

function uploadTxt(sftp, string, path) {
  return new Promise((resolve, reject) => {
    sftp.write({
      file: $data({ string }),
      path,
      // progress(sent) {}, // watch out!!
      handler(success) {
        if (success) resolve();
        else reject(new Error('upload failed'));
      },
    });
  });
}

function base64Encode(text) {
  // return $text.base64Encode(text)
  // return btoa(text)
  return Base64.encode(text);
}

function base64Decode(b64) {
  // return $text.base64Decode(b64)
  // return atob(b64)
  return Base64.decode(b64);
}

// jsbox 原生的 base64 编解码有 bug
const Base64 = {
  // private property
  _keyStr: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=',

  // public method for encoding
  encode(input) {
    let output = '';
    let chr1;
    let chr2;
    let chr3;
    let enc1;
    let enc2;
    let enc3;
    let enc4;
    let i = 0;

    input = Base64._utf8_encode(input);

    while (i < input.length) {
      chr1 = input.charCodeAt(i++);
      chr2 = input.charCodeAt(i++);
      chr3 = input.charCodeAt(i++);

      enc1 = chr1 >> 2;
      enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
      enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
      enc4 = chr3 & 63;

      if (isNaN(chr2)) {
        enc3 = enc4 = 64;
      } else if (isNaN(chr3)) {
        enc4 = 64;
      }

      output = output
        + this._keyStr.charAt(enc1)
        + this._keyStr.charAt(enc2)
        + this._keyStr.charAt(enc3)
        + this._keyStr.charAt(enc4);
    }

    return output;
  },

  // public method for decoding
  decode(input) {
    let output = '';
    let chr1;
    let chr2;
    let chr3;
    let enc1;
    let enc2;
    let enc3;
    let enc4;
    let i = 0;

    input = input.replace(/[^A-Za-z0-9+/=]/g, '');

    while (i < input.length) {
      enc1 = this._keyStr.indexOf(input.charAt(i++));
      enc2 = this._keyStr.indexOf(input.charAt(i++));
      enc3 = this._keyStr.indexOf(input.charAt(i++));
      enc4 = this._keyStr.indexOf(input.charAt(i++));

      chr1 = (enc1 << 2) | (enc2 >> 4);
      chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      chr3 = ((enc3 & 3) << 6) | enc4;

      output += String.fromCharCode(chr1);

      if (enc3 !== 64) {
        output += String.fromCharCode(chr2);
      }
      if (enc4 !== 64) {
        output += String.fromCharCode(chr3);
      }
    }

    output = Base64._utf8_decode(output);

    return output;
  },

  // private method for UTF-8 encoding
  _utf8_encode(string) {
    string = string.replace(/\r\n/g, '\n');
    let utftext = '';

    for (let n = 0; n < string.length; n++) {
      const c = string.charCodeAt(n);

      if (c < 128) {
        utftext += String.fromCharCode(c);
      } else if (c > 127 && c < 2048) {
        utftext += String.fromCharCode((c >> 6) | 192);
        utftext += String.fromCharCode((c & 63) | 128);
      } else {
        utftext += String.fromCharCode((c >> 12) | 224);
        utftext += String.fromCharCode(((c >> 6) & 63) | 128);
        utftext += String.fromCharCode((c & 63) | 128);
      }
    }

    return utftext;
  },

  // private method for UTF-8 decoding
  _utf8_decode(utftext) {
    let string = '';
    let i = 0;
    let c = 0;
    let c2 = 0;
    let c3 = 0;

    while (i < utftext.length) {
      c = utftext.charCodeAt(i);

      if (c < 128) {
        string += String.fromCharCode(c);
        i++;
      } else if (c > 191 && c < 224) {
        c2 = utftext.charCodeAt(i + 1);
        string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
        i += 2;
      } else {
        c2 = utftext.charCodeAt(i + 1);
        c3 = utftext.charCodeAt(i + 2);
        string += String.fromCharCode(
          ((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63),
        );
        i += 3;
      }
    }

    return string;
  },
};
