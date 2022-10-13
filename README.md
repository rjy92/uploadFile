# 文件上传示例：

```bash
npm run start   # 启动前端
npm run server  # 启动后端
```

## 单个文件上传 form-data
主要是利用js form表单方式进行上传
```js
// 将文件传给服务器 FormData / base64
let formData = new FormData();
formData.append('file', _file)
formData.append('filename', _file.name)
instance.post('/upload_single', formData).then(data => {
    const { code } = data;
    if (code === 0) {
        alert(`file 上传成功,您可以通过${data.servicePath} 访问这个资源`);
        clearHandle()
        return;
    }
    return Promise.reject(data.codeText);
}).catch((e) => {
    clearHandle()
    console.log(e);
});
```

## 单个文件上传 base64

[FileReader](https://developer.mozilla.org/zh-CN/docs/Web/API/FileReader)

```js
// 利用FildReader 得到文件的base64
/**
 * FileReader.readAsDataURL()开始读取指定的Blob中的内容。一旦完成，result属性中将包含一个data: URL格式的Base64字符串以表示所读取文件的内容。
 * onload:文件读取完成时触发
 * **/
 const changeBase64 = function (file) {
    return new Promise((resolve) => {
        let fileReader = new FileReader();
        fileReader.readAsDataURL(file);
        fileReader.onload = (e) => {
            resolve(e.target.result);
        };
    })
}
// 将上传的文件转成base64
base64 = await changeBase64(file);
console.log('base64', base64)

// 上传文件：
try {
    const data = await instance.post('/upload_single_base64',
        {
            file: encodeURIComponent(base64), // 防止乱码问题
            filename: file.name,
        },
        {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        }
    );
    console.log('come in upload_single_base64')
    const { code } = data;
    if (code === 0) {
        // alert('文件上传成功!');
        alert(`file 上传成功,您可以通过${data.servicePath} 访问这个资源`);
        return
    }
    throw data.codeText; // 抛出异常
} catch (e) {
    // 文件上传错误
    alert('很遗憾，文件上传失败，请稍后重试')
}
```
## 单个文件上传 图片缩略图, 客户端自定义名字

```js

const changeBase64 = function (file) {
    return new Promise((resolve) => {
        let fileReader = new FileReader();
        fileReader.readAsDataURL(file);
        fileReader.onload = (e) => {
            resolve(e.target.result);
        };
    })
}

/**
 *
 * @param {} file
 * @returns
 * 根据内容生成hash名字
 */
//  SparkMD5 生成HASH
const changeBuffer = (file) => {
    return new Promise((resolve) => {
        let fileReader = new FileReader();
        fileReader.readAsArrayBuffer(file);
        fileReader.onload = (e) => {
            let buffer = e.target.result;
            console.log(buffer);
            const spark = new SparkMD5.ArrayBuffer();
            spark.append(buffer);
            const HASH = spark.end();
            const suffix = /\.([0-9a-zA-Z]+)$/.exec(file.name)[1];
            console.log(HASH);
            resolve({
                buffer,
                HASH,
                suffix,
                filename: `${HASH}.${suffix}`,
            });
        };
    });
};
// 监听用户选择文件的操作
upload_input.addEventListener('change', async function () {
    // 获取用户选择的文件
    console.log(upload_input.files, '???');
    let file = upload_input.files[0];
    let base64 = null;
    /**
    * + name 文件名
    * + size 文件大小 B字节
    * + type 文件类型
    */
    if (!file) return;
    // 将上传的文件转成base64
    base64 = await changeBase64(file);
    _file = file;
    upload_abber_img.src = base64;
    upload_abber_img.style.display = 'block';
})

// 上传到服务器,BASE64的格式
upload_button_upload.addEventListener('click', async function () {
    if (!_file) return alert('请选择图片');
    // 生成文件的HASH名
    const { filename } = await changeBuffer(_file);
    let formData = new FormData();
    formData.append('file', _file);
    formData.append('filename', filename); // 处理名字,服务端不提供名字编译
    instance.post('/upload_single_name', formData).then((data) => {
        console.log('come in upload_single_name')
        const { code } = data;
        if (code === 0) {
            alert(`file 上传成功,您可以通过${data.servicePath} 访问这个资源`);
            return;
        }
        console.log(data);
        return Promise.reject(data.codeText);
    }).catch((e) => {
        console.log('文件上传失败，请稍后重试');
    }).finally(() => {
        upload_abber.style.display = "none";
        upload_abber_img.src = ""
        _file = null
    })
})

```

## 单个文件上传 进度条管控
上传进度，主要是靠[axios](https://www.axios-http.cn/docs/req_config)中回调   
onUploadProgress：允许为上传处理进度事件
```js
try {
    let formData = new FormData();
    formData.append('file', file);
    formData.append('filename', file.filename);
    const data = await instance.post('/upload_single', formData, {
        //文件上传中进度的管控
        onUploadProgress: (e) => {
            console.log(e);
            const { loaded, total } = e;
            console.log(
                `${(loaded / total) * 100}%`,
                ' `${loaded/total*100}%`'
            );
            upload_progress.style.display = 'block';
            upload_progrees_value.style.width = `${(loaded / total) * 100}%`;
        },
    });
    const { code } = data;
    if (code === 0) {
        upload_progrees_value.style.width = `100%`;
        await delay()
        alert(`file 上传成功,您可以通过${data.servicePath} 访问这个资源`);
        return;
    }
    throw data.codeText;
} catch (e) {
    //
    console.log(e);
    alert('文件上传失败，请您稍后重试');
} finally {
    //可处理loading等数据
}

```

## 多个文件上传 进度条管控
 
主要是对上传列表做一个遍历上传。
结合Promise.all() 表示是否全部上传成功！
```js
/**
 *
 * 循环发送请求
 */
const upload_list_arr = Array.from(upload_list.querySelectorAll('li'));

const _files = files.map((item) => {
    const fm = new FormData();
    const curLi = upload_list_arr.find(
        (liBox) => liBox.getAttribute('key') === item.key
    );
    const curSpan = curLi
        ? curLi.querySelector('span:nth-last-child(1)')
        : null;
    fm.append('file', item.file);
    fm.append('filename', item.filename);
    return instance.post('/upload_single', fm, {
        onUploadProgress(e) {
            // 监听每一个上传进度
            const { loaded, total } = e;
            const progress = `${((loaded / total) * 100).toFixed(2)}%`;
            if (curSpan) {
                curSpan.innerText = progress;
            }
        },
    }).then((data) => {
        const { code } = data;
        if (code === 0) {
            if (curSpan) {
                curSpan.innerText = '100%';
            }
            return Promise.resolve(data);
        }
        return Promise.reject(data.codeText);
    });
});
Promise.all(_files).then((res) => {
    console.log(res);
    alert('恭喜您，所有文件上传成功');
}).catch(() => [
    alert('很遗憾，上传过程中出现问题，请您稍后重试')
]).finally(() => {
    file = []
    upload_list.innerHTML = ''
    upload_list.style.display = "none"
})
```

## 拖拽上传
拖拽上传方法：拖拽获取 dragenter，dragover，drag
drop 中的事件参数回携带 dataTransfer， 里面包含着 files。提取出来，再上传即可！
```js
// 拖拽进入
dragBox.addEventListener('dragenter', function (e) {
    console.log('拖拽进入')
    e.preventDefault();
    this.style.border = '1px solid red';
});

// 拖拽放下
dragBox.addEventListener('drop', function (e) {
    console.log('拖拽放下')
    e.preventDefault();
    this.style.border = '';

    const {
        dataTransfer: { files },
    } = e;
    const file = files[0];
    uploadFile(file);
});

dragBox.addEventListener('dragover', function (e) {
    console.log('区域内移动')
    e.preventDefault();
});
dragBox.addEventListener('dragleave', function (e) {
    e.preventDefault();
    console.log('拖拽离开')
    this.style.border = '1px dashed #cc';
});

```

## 切片上传

切片上传相对于上面，复杂一些, 当然也没有想象中的难！
1. 前端负责分片，服务端负责合并
2. 如何分片
    - 首先是选择上传的文件资源，接着就可以得到对应的文件对象 File，而 File.prototype.slice 方法可以实现资源的分块，当然也有人说是 Blob.prototype.slice 方法，
    - Blob.prototype.slice === File.prototype.slice
3. 服务端如何知道要整合哪些资源？
    - 在发送请求资源时，前端会定好每个文件对应的序号，并将当前分块、序号以及文件 hash 等信息一起发送给服务端，服务端在进行合并时，通过序号进行依次合并即可 
    - 前端可以基于 Promise.all
将这多个接口整合，上传完成在发送一个合并的请求，通知服务端进行合并
4. 上传失败，怎么办？
一旦服务端某个上传请求失败，会返回当前分块失败的信息，其中会包含文件名称、文件 hash、分块大小以及分块序号等，前端拿到这些信息后可以进行重传，同时考虑此时是否需要
将 Promise.all 替换为 Promise.allSettled 更方便
5. 暂停功能实现：若想实现暂停功能，
    - 若文件上传时串行的，则设置一个标识即可
    - 若文件上传时并行的，则需要强制取消上传[AbortController](https://www.axios-http.cn/docs/cancellation)
```js
const changeBuffer = (file) => {
    return new Promise((resolve) => {
        let fileReader = new FileReader();
        fileReader.readAsArrayBuffer(file);
        fileReader.onload = (e) => {
            let buffer = e.target.result;
            const spark = new SparkMD5.ArrayBuffer();
            spark.append(buffer);
            const HASH = spark.end();
            const suffix = /\.([0-9a-zA-Z]+)$/.exec(file.name)[1];
            resolve({
                buffer,
                HASH,
                suffix,
                filename: `${HASH}.${suffix}`,
            });
        };
    });
};

// 监听用户选择文件的操作
upload_input.addEventListener('change', async function () {
    // 获取用户选择的文件
    console.log(upload_input.files, '???');
    let file = upload_input.files[0];
    /**
     * + name 文件名
     * + size 文件大小 B字节
     * + type 文件类型
     */
    if (!file) return;
    upload_progress.style.display = 'block'
    let already = [], data = null, chunks = [];
    // 获取文件的hash值
    let { HASH, suffix } = await changeBuffer(file)
    // 获取已经上传的切片信息
    try {
        data = await instance.get('/upload_already', {
            params: {
                HASH
            }
        })
        if (+data.code === 0) {
            already = data.fileList
        }
    } catch (error) { }

    // 实现文件的切片处理[固定数量/固定大小]
    let maxSize = 1024 * 100,
        maxCount = Math.ceil(file.size / maxSize), index = 0
    // 判断当前文件可以切出多少切片
    if (maxCount > 100) {
        // 如果切片数量大于最大值
        maxSize = file.size / 100; // 则改变切片大小
        maxCount = 100;
    }
    while (index < maxCount) {
        chunks.push({
            file: file.slice(index * maxSize, (index + 1) * maxSize),
            filename: `${HASH}_${index + 1}.${suffix}`,
        });

        index++;
    }

    const clear = () => {
        upload_progress.style.display = 'none'
        upload_progrees_value.style.width = '0%'
    }
    // 上传成功处理
    let index_complate = 0
    const complate = async () => {

        index_complate++;
        let progress = `${index_complate/maxCount*100}%` // 进度条
        upload_progrees_value.style.width = progress
        console.log('index_complate:', index_complate, '------', progress)
        if (index_complate < maxCount)  return
            
        upload_progrees_value.style.width = '100%'
        try {
            data = await instance.post('/upload_merge', { HASH: HASH, count: maxCount }, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            })
            if (+data.code === 0) {
                alert(`file 上传成功,您可以通过${data.servicePath} 访问这个资源`);
                clear()
                return
            }
            throw data.codeText
        } catch (error) {
            console.log('切片合并失败，请稍后重试', error)
            clear()
        }
    }

    // 把每个切片上传到服务器上
    chunks.forEach((chunk) => {
        //已经上传的无需再次上传
        if (already.length > 0 && already.includes(chunk.filename)) {
            // 表示切片已经存在
            complate()
            return;
        }

        const fm = new FormData();
        fm.append('file', chunk.file);
        fm.append('filename', chunk.filename);

        instance.post('/upload_chunk', fm).then(data => {
            if (+data.code === 0) {
                complate()
                return
            }
            return Promise.reject(data.codeText);

        }).catch((err) => {
            console.log(err)
            console.log('当前切片上传失败')
            clear()
        });
    })


});
```


<font color=#FF000 >**并行实现暂停上传**</font>
```js
const controller = new AbortController();
req.signal = controller.signal
controller.abort()
```
```js
// 切片加工（上传前预处理 为文件添加hash等）
async handleUpload() {
  if (!this.container.file) return;
  // 切片生成
  const fileChunkList = this.createFileChunk(this.container.file);
  // 文件hash生成
  this.container.hash = await this.calculateHash(fileChunkList);
    
  // hash验证 (verify为后端验证接口请求)
  const { haveExisetd, uploadedList } = await verify(this.container.hash)
  // 判断
  if(haveExisetd) {
  	this.$message.success("秒传：上传成功") 
    return   
  } 
   
  this.data = fileChunkList.map(({ file }，index) => ({
    chunk: file,
    // 注：这个是切片hash   这里的hash为文件名 + 切片序号，也可以用md5对文件进行加密获取唯一hash值来代替文件名
    hash: this.container.hash + "-" + index
  }));
  await this.uploadChunks(uploadedList);
}


// 上传切片
async uploadChunks(uploadedList = []) {
 // 需要把requestList放到全局，因为要通过操控requestList来实现中断
 this.requestList = this.data
    // 过滤出来未上传的切片
   .filter(({ hash }) => !uploadedList.includes(hash))
 	// 构造formData
   .map(({ chunk，hash }) => {
     const formData = new FormData();
     formData.append("chunk", chunk);
     formData.append("hash", hash);
     formData.append("filename", this.container.file.name);
     return { formData };
   })
 	// 发送请求 上传切片
   .map(async ({ formData }, index) =>
     request(formData).then(() => {
       // 将请求成功的请求剥离出requestList
       this.requestList.splice(index, 1)
     })
   );
 await Promise.all(this.requestList); // 等待全部切片上传完毕
 // 合并之前添加一层验证 验证全部切片传送完毕
 if(uploadedList.length + this.requestList.length == this.data.length){
	await merge(this.container.file.name) // 发送请求合并文件
 }
},
    
// 暂停上传   
handlePause() {
	this.requestList.forEach((req) => {
        // 为每个请求新建一个AbortController实例
     	const controller = new AbortController();
        req.signal = controller.signal
        controller.abort()
    })
}

// 恢复上传
async handleRecovery() {
    //获取已上传切片列表 (verify为后端验证接口请求)
	const { uploadedList } = await verify(this.container.hash)
    await uploadChunks(uploadedList)
}
```