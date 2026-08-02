import client from './client'

export const listTemplates = () =>
  client.get('/templates').then(r => r.data)

export const getTemplate = (id) =>
  client.get(`/templates/${id}`).then(r => r.data)

export const createTemplate = (payload) =>
  client.post('/templates', payload).then(r => r.data)

export const updateTemplate = (id, payload) =>
  client.put(`/templates/${id}`, payload).then(r => r.data)

export const deleteTemplate = (id) =>
  client.delete(`/templates/${id}`)
