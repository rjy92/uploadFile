const delay = function (interval) {
    typeof interval !== 'number' ? interval = 1000 : null
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve()
        }, interval)
    })
};
// 基于form-DATA实现文件上传
(function () {
    let upload = document.querySelector('#upload1');
    let upload_input = upload.querySelector('.upload_ipt');
    let upload_button_select = upload.querySelector('.upload_button.select');
    let upload_button_upload = upload.querySelector('.upload_button.upload');
    let upload_tip = upload.querySelector('.upload_tip');
    let upload_list = upload.querySelector('.upload_list');
    let _file = null; // 初始化文件

    const clearHandle = () => {
        // 点击的是移除按钮
        upload_list.style.display = 'none';
        upload_list.innerHTML = '';
        upload_tip.style.display = 'block';
        _file = null;
    }
    // 移除按钮
    upload_list.addEventListener('click', function (e) {
        let target = e.target;
        // 事件委托, 提高页面性能
        if (target.tagName === 'EM') {
            clearHandle()
        }
    });


    //监听用户选择文件操作
    upload_input.addEventListener('change', function () {
        // 获取用户选中的文件
        console.log(upload_input.files, '???');
        //当前文件，数组第一个值
        /**
         * + name 文件名
         * + size 文件大小 B字节
         * + type 文件类型
         */
        let file = upload_input.files[0]
        if (!file) return;

        // 限制文件上传的格式
        // 方案1: 限制文件上传的格式,通过js判断
        // if (!/(png|jpg|jpeg)/i.test(file.type)) {
        //     alert('上传文件格式不正确');
        // }

        // 限制文件上传大小
        if (file.size > 2 * 1024 * 1024) {
            alert('上传文件不能超过2MB');
            return;
        }

        upload_tip.style.display = 'none';
        upload_list.innerHTML = `
            <li>
                <span>文件: ${file.name}</span>
                <span><em>移除</em></span>
            </li>
        `;

        _file = file;

    })
    //点击选择文件按钮，触发上传文件INPUT框选择文件行为
    upload_button_select.addEventListener('click', function () {
        upload_input.click()
    })

    // 点击上传文件到服务器:FormData / Base64
    upload_button_upload.addEventListener('click', function () {
        if (!_file) {
            return alert('请您先选择上传的文件');
        }

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
    })
})();


/**
 * base64
 */
(function () {
    let upload = document.querySelector('#upload2');
    let upload_input = upload.querySelector('.upload_ipt');
    let upload_button_select = upload.querySelector('.upload_button.select');

    const changeBase64 = function (file) {
        return new Promise((resolve) => {
            let fileReader = new FileReader();
            fileReader.readAsDataURL(file);
            fileReader.onload = (e) => {
                resolve(e.target.result);
            };
        })
    }
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
        // 方案1: 限制文件上传的格式
        if (!/(png|jpg|jpeg)/i.test(file.type)) {
            alert('上传文件格式不正确');
        }
        // 限制文件上传的大小
        if (file.size > 2 * 1024 * 1024) {
            alert('上传文件不能超过2MB');
            return;
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
    })

    // 点击文件选择按钮,触发上传文件的行为
    upload_button_select.addEventListener('click', function () {
        upload_input.click();
    });
})();


/**
 * 缩略图方式 && 自动生成名字
 */
(function () {
    let upload = document.querySelector('#upload3');
    let upload_input = upload.querySelector('.upload_ipt');
    let upload_button_select = upload.querySelector('.upload_button.select');
    let upload_button_upload = upload.querySelector('.upload_button.upload');
    let upload_abber = upload.querySelector('.upload_abber');
    let upload_abber_img = upload_abber.querySelector('img');
    let _file = null;

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

    // 点击文件选择按钮,触发上传文件的行为
    upload_button_select.addEventListener('click', function () {
        upload_input.click();
    });


    // 上传到服务器
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
})();


// 文件进度管控

(function () {
    let upload = document.querySelector('#upload4');
    let upload_input = upload.querySelector('.upload_ipt');
    let upload_button_select = upload.querySelector('.upload_button.select');
    let upload_progress = upload.querySelector('.upload_progress');
    let upload_progrees_value = upload.querySelector('.progress');

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
    });

    // 点击文件选择按钮,触发上传文件的行为
    upload_button_select.addEventListener('click', function () {
        upload_input.click();
    });
})();


// 多文件上传
(function () {
    let upload = document.querySelector('#upload5');
    let upload_input = upload.querySelector('.upload_ipt');
    let upload_button_select = upload.querySelector('.upload_button.select');
    let upload_list = upload.querySelector('.upload_list');
    const upload_button_upload = upload.querySelector('.upload_button.upload');
    let files = [];

    upload_list.addEventListener('click', function (e) {
        const target = e.target;
        if (target.tagName === 'EM') {
            console.log('okxxx');
            const curli = target.parentNode.parentNode;
            if (!curli) {
                return;
            }
            const key = curli.getAttribute('key');
            upload_list.removeChild(curli); // 移除元素
            files = files.filter((item) => item.key !== key);
            console.log(files);
            if (files.length === 0) {
                upload_list.style.display = "none"
            }
        }
    });
    // 监听用户选择文件的操作
    upload_input.addEventListener('change', async function () {
        // 获取用户选择的文件
        files = Array.from(upload_input.files);
        if (files.length === 0) return
        console.log(files)
        let str = '';
        // 我们重构数据的结构，给每一项设置一个位置值，作为自定义属性存储到元素上，后期点击删除按钮的时候，我们基于这个自定义属性
        // 获取唯一值，再到集合中根据这个唯一值，删除集合中这一项
        files = files.map((file) => {
            return {
                file,
                filename: file.name,
                key: createRandom(),
            };
        });
        files.forEach((item, index) => {
            str += `
                <li key=${item.key}>
                    <span>文件${index + 1} : ${item.filename}</span>
                    <span>
                        <em>删除</em>
                    </span>
                </li>
            `;
        });
        upload_list.innerHTML = str;
        upload_list.style.display = "block"
    });

    // 点击文件选择按钮,触发上传文件的行为
    upload_button_select.addEventListener('click', function () {
        upload_input.click();
    });

    upload_button_upload.addEventListener('click', function () {
        if (files.length === 0) {
            return alert('请选择文件');
        }
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
    });
})();


/**
 * 拖拽上传
 */
(function () {
    const upload = document.querySelector('#upload6');
    const dragBox = document.querySelector('#dragBox');
    const upload_ipt = upload.querySelector('.upload_ipt');
    const upload_upload_iptbox = upload.querySelector('.upload-box');
    const upload_button = upload.querySelector('#upload-button');

    const uploadFile = (file) => {
        if (!file) return;
        // 将文件传给服务器 FormData / base64
        let formData = new FormData();
        formData.append('file', file);
        formData.append('filename', file.name);
        instance.post('/upload_single', formData).then((data) => {
            const { code } = data;
            if (code === 0) {
                alert(`file 上传成功,您可以通过${data.servicePath} 访问这个资源`);
                return;
            }
            console.log(data);
            return Promise.reject(data.codeText);
        })
            .catch((e) => {
                console.log(e);
            });
    };

    // 拖拽获取 dragenter，dragover，drag
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

    upload_button.addEventListener('click', function () {
        upload_ipt.click();
    });

    upload_ipt.addEventListener('change', function (e) {
        // console.log(e)
        const file = e.target.files[0];
        uploadFile(file);
    });
})();




//大文件上传
(function () {
    let upload = document.querySelector('#upload7');
    let upload_input = upload.querySelector('.upload_ipt');
    let upload_button_select = upload.querySelector('.upload_button.select');
    let upload_progress = upload.querySelector('.upload_progress');
    let upload_progrees_value = upload.querySelector('.progress');

    /**
     *
     * @param {} file
     * @returns
     * 根据内容生成hash名字
     */
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

    // 点击文件选择按钮,触发上传文件的行为
    upload_button_select.addEventListener('click', function () {
        upload_input.click();
    });
})();

