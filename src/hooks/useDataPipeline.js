import { useEffect, useRef, useState, useCallback } from 'react'

export function useDataPipeline() {
  const ws = useRef(null)
  const [isConnected, setIsConnected] = useState(false)
  
  // Handlers registered by components
  const txHandlers = useRef([])
  const metricHandlers = useRef([])

  useEffect(() => {
    // Connect to WebSocket
    const socket = new WebSocket('ws://localhost:8000/api/stream')
    
    socket.onopen = () => {
      console.log('Connected to real-time data pipeline')
      setIsConnected(true)
    }
    
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        if (message.type === 'TX_PROCESSED') {
          txHandlers.current.forEach(handler => handler(message.data, message.original))
        } else if (message.type === 'METRICS_PROCESSED') {
          metricHandlers.current.forEach(handler => handler(message.data, message.original))
        }
      } catch (err) {
        console.error('Failed to parse WS message', err)
      }
    }
    
    socket.onclose = () => {
      console.log('Disconnected from real-time data pipeline')
      setIsConnected(false)
    }
    
    ws.current = socket
    
    return () => {
      socket.close()
    }
  }, [])
  
  const pushTransaction = useCallback((txData) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      // Map to Python TransactionPayload expected schema
      const payload = {
        ...txData,
        transaction_id: txData.id,
        account_id: txData.src,
        source_account: txData.src,
        dest_account: txData.dst,
        timestamp: new Date(txData.timestamp).toISOString(),
        component_id: 'payment-service'
      }
      ws.current.send(JSON.stringify({ type: 'TX_INGEST', data: payload }))
    }
  }, [])

  const pushMetrics = useCallback((metricsData) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'METRICS_INGEST', data: metricsData }))
    }
  }, [])

  const onTxProcessed = useCallback((handler) => {
    txHandlers.current.push(handler)
    return () => {
      txHandlers.current = txHandlers.current.filter(h => h !== handler)
    }
  }, [])

  const onMetricsProcessed = useCallback((handler) => {
    metricHandlers.current.push(handler)
    return () => {
      metricHandlers.current = metricHandlers.current.filter(h => h !== handler)
    }
  }, [])

  return {
    isConnected,
    pushTransaction,
    pushMetrics,
    onTxProcessed,
    onMetricsProcessed
  }
}
