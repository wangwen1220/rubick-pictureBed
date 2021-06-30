<template>
  <div id="pg-rubick-pictureBed">
    <div class="upload-container">
      <a-upload-dragger
          v-model:fileList="fileList"
          name="file"
          :multiple="true"
          :action="settings.action"
          :data="settings.data"
          @change="handleChange"
          :showUploadList="false"
          :beforeUpload="handleUpload"
      >
        <p class="ant-upload-drag-icon">
          <CloudUploadOutlined />
        </p>
        <p class="ant-upload-text">将文件拖到此处，或点击上传</p>
        <p class="ant-upload-hint">
          支持单个或批量上传。 严格禁止上传公司数据或其他文件。
        </p>
      </a-upload-dragger>
    </div>
    <div class="pic-container">
      <div class="upload-img" :key="index" v-for="(img, index) in imgList">
        <a-spin :spinning="!img.src" tip="上传中...">
          <a-image :src="img.src || img.originSrc" />
          <div class="size">
            <span>{{img.distSize}}/{{img.originSize}} kb</span>
          </div>
        </a-spin>
        <div class="edit-container">
          <span class="file-name">{{img.fileName}}</span>
          <CopyOutlined @click="copySrc(img.src)" class="edit-container-icon" />
          <DeleteOutlined class="edit-container-icon" @click="deleteImg(index)" />
        </div>
      </div>
    </div>
    <div class="settings" @click="visible=true">
      <SettingOutlined />
    </div>
    <a-drawer
        :width="500"
        title="图床设置"
        placement="right"
        :closable="true"
        v-model:visible="visible"
    >
      <a-form :label-col="labelCol" :wrapper-col="wrapperCol">
        <a-form-item label="开启压缩">
          <a-switch v-model:checked="settings.compress" />
        </a-form-item>
        <a-form-item label="图片上传地址" v-bind="validateInfos.action">
          <a-input placeholder="图片上传地址" v-model:value="settings.action"/>
        </a-form-item>
        <a-form-item label="上传所需参数">
          <a-textarea placeholder="如：{action: 'filed'}" @change="e => changeValue(e, 'data')" :value="getString(settings.data)"/>
        </a-form-item>
        <a-form-item label="设置上传的请求头部">
          <a-textarea @change="e => changeValue(e, 'headers')" :value="getString(settings.headers)" />
        </a-form-item>
        <a-form-item :wrapper-col="{ span: 14, offset: 4 }">
          <a-button type="primary" @click="onSubmit">保存</a-button>
        </a-form-item>
      </a-form>
    </a-drawer>
  </div>
</template>

<script>
import { CloudUploadOutlined, CopyOutlined, DeleteOutlined, SettingOutlined } from '@ant-design/icons-vue';
import {reactive, toRefs} from 'vue';
import {useForm} from "@ant-design-vue/use";
import { message } from 'ant-design-vue';

const defaultConfig = {
  action: '',
  data: {
    action: 'fileUpload'
  },
  headers: {},
  compress: true,
}

export default {
  name: 'App',
  setup() {
    const state = reactive({
      fileList: [],
      imgList: [],
      settings: defaultConfig,
      visible: false,
    });

    (async () => {
      const cacheData = await window.utools.db.get('rubick-img-pictureBed');
      const cacheConfig = await window.utools.db.get('rubick-img-pictureBed-config');
      try {
        state.imgList = JSON.parse(cacheData.data || '[]');
        state.settings = cacheConfig.data ? JSON.parse(cacheConfig.data) : cacheConfig.data;
      } catch (e) {
        state.settings = defaultConfig;
        // ignore
      }
    })()

    const handleChange = ({file}) => {
      if (file.status === 'error') {
        return message.error(file.response);
      }
      try {
        const imgSrc = file.response && file.response.data && file.response.data[0];
        if (!imgSrc) return;
        state.imgList = state.imgList.map(img => {
          if (img.uid === file.uid) {
            return {
              ...img,
              src: imgSrc.replace('http', 'https'),
            }
          }
          return img;
        })

        window.utools.db.put({
          _id: "rubick-img-pictureBed",
          data: JSON.stringify(state.imgList)
        });
      } catch (e) {
        console.log(e);
        // return message.error(e);
      }
    }

    const deleteImg = (id) => {
      state.imgList.splice(id, 1);
      window.utools.db.put({
        _id: "rubick-img-pictureBed",
        data: JSON.stringify(state.imgList)
      });
    }

    const rulesRef = reactive({
      action: [
        {
          required: true,
          message: '请输入模板名称',
        },
      ]
    });

    const {resetFields, validateInfos} = useForm(state, rulesRef);

    const handleUpload = (file) => {
      const uploadFl = {
        uid: file.uid,
        originSrc: window.URL.createObjectURL(file),
        distSize: '-',
        originSize: '-',
        fileName: file.name
      }
      state.imgList.unshift(uploadFl);

      if (!state.settings.compress) {
        return true;
      }

      return new Promise((resolve) => {
        (async () => {
          const fileObj = await window.operate.compressFromImagemin(file.path, state.settings.compress);
          const originFile = fileObj.compressFile;
          const filename = file.name;
          const distFile = window.operate.upload({
            ...file,
            file: {
              ...file,
              originFile,
            },
            filename,
          });
          uploadFl.distSize = fileObj.distSize || fileObj.originSize.toFixed(2);
          uploadFl.originSize = fileObj.originSize.toFixed(2);

          resolve(distFile);
        })()
      })
    }

    const copySrc = (src) => {
      if (!src) return message.error('图片未上传完成！')
      window.utools.copyText(src);
      message.success('图片已拷贝至剪切板！')
    }

    const onSubmit = () => {
      const config = state.settings;
      window.utools.db.put({
        _id: "rubick-img-pictureBed-config",
        data: JSON.stringify(config)
      });
      state.visible = false;
      message.success('已保存！')
    }

    return {
      ...toRefs(state),
      handleChange,
      deleteImg,
      labelCol: {span: 8},
      wrapperCol: {span: 16},
      resetFields,
      validateInfos,
      handleUpload,
      getString: (str) => JSON.stringify(str),
      copySrc,
      onSubmit,
      changeValue: (e, target) => {
        try {
          state.settings[target] = JSON.parse(e.target.value);
        } catch (e) {
          //
        }
      }
    }
  },
  components: {
    CloudUploadOutlined,
    DeleteOutlined,
    CopyOutlined,
    SettingOutlined
  }
}
</script>

<style lang="less">
* {
  margin: 0;
  padding: 0;
}
::-webkit-scrollbar{
  width:0;
}
#app {
  width: 800px;
}
#pg-rubick-pictureBed {
  height: 540px;
  background: #fafafa;
  padding: 10px;
  box-sizing: border-box;
  position: relative;
  overflow: hidden;
  .upload-container {
    height: 160px;
    .ant-upload {
      background: #fff;
    }
  }
  .pic-container {
    padding: 10px 0;
    height: 410px;
    overflow: auto;
  }
  .upload-img {
    width: 140px;
    margin-right: 20px;
    display: inline-block;
    vertical-align: top;
    margin-bottom: 10px;
    position: relative;
    .size {
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.2);
      position: absolute;
      top: 0;
      left: 0;
      font-size: 14px;
      display: flex;
      align-items: flex-end;
      justify-content: flex-end;
      color: #fff;
    }
    .edit-container {
      color: #999;
      font-size: 16px;
      cursor: pointer;
      .file-name {
        margin-right: 5px;
        display: inline-block;
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;
        word-break: break-all;
        max-width: 90px;
        font-size: 14px;
      }
      .edit-container-icon {
        margin-right: 5px;
      }
    }
    &:nth-child(5n) {
      margin-right: 0;
    }
    img {
      width: 100%;
      height: 140px;
    }
  }
  .settings {
    z-index: 99;
    width: 40px;
    height: 40px;
    border-radius: 100%;
    background: #fff;
    font-size: 20px;
    position: absolute;
    bottom: 50px;
    right: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    cursor: pointer;
  }
}
</style>
