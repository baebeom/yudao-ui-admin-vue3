import * as FileApi from '@/api/infra/file'
import {
  UploadRawFile,
  UploadRequestOptions
} from 'element-plus/es/components/upload/src/upload'
import axios from 'axios'

/**
 * 上传类型
 */
enum UPLOAD_TYPE {
  // 客户端直接上传（只支持S3服务）
  CLIENT = 'client',
  // 客户端发送到后端上传
  SERVER = 'server'
}

/**
 * 获得上传 URL
 */
export const getUploadUrl = (): string => {
  return import.meta.env.VITE_BASE_URL + import.meta.env.VITE_API_URL + '/infra/file/upload'
}

export const useUpload = (directory?: string) => {
  // 后端上传地址
  const uploadUrl = getUploadUrl()
  // 是否使用前端直连上传
  const isClientUpload = UPLOAD_TYPE.CLIENT === import.meta.env.VITE_UPLOAD_TYPE
  
  // 文件上传进度监听
  const uploadProgressHandler = (event: ProgressEvent) => {
    // 进度事件处理
    console.log('上传进度:', event)
  }

  // 重写ElUpload上传方法
  const httpRequest = async (options: UploadRequestOptions) => {
    // 模式一：前端上传
    if (isClientUpload) {
      // 1.1 生成文件名称
      const fileName = (options.file as File).name || options.filename || 'avatar.png'
      // 1.2 获取文件预签名地址
      const presignedInfo = await FileApi.getFilePresignedUrl(fileName, directory)
      // 1.3 上传文件
      return axios
        .put(presignedInfo.uploadUrl, options.file, {
          headers: {
            'Content-Type': (options.file as File).type || 'application/octet-stream'
          }
        })
        .then(() => {
          // 1.4. 记录文件信息到后端（异步）
          createFile(presignedInfo, options.file as UploadRawFile, fileName)
          // 通知成功
          return { data: presignedInfo.url }
        })
    } else {
      // 模式二：后端上传
      return new Promise((resolve, reject) => {
        FileApi.updateFile({ file: options.file, directory })
          .then((res: any) => {
            if (res.code === 0) {
              resolve(res)
            } else {
              reject(res)
            }
          })
          .catch((res) => {
            reject(res)
          })
      })
    }
  }

  return {
    uploadUrl,
    httpRequest
  }
}

/**
 * 创建文件信息
 */
function createFile(vo: FileApi.FilePresignedUrlRespVO, file: UploadRawFile, fileName: string) {
  const fileVo = {
    configId: vo.configId,
    url: vo.url,
    path: vo.path,
    name: fileName,
    type: file.type || 'application/octet-stream',
    size: file.size
  }
  FileApi.createFile(fileVo)
  return fileVo
}