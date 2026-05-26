import { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  handleReset = () => {
    this.setState({ error: null })
    window.location.reload()
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-gray-50">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Algo deu errado</h2>
          <p className="text-sm text-gray-500 mb-1 max-w-sm">
            Ocorreu um erro inesperado. Tente recarregar a página.
          </p>
          {import.meta.env.DEV && (
            <p className="text-xs text-red-400 font-mono mt-2 mb-5 max-w-md break-all">
              {this.state.error.message}
            </p>
          )}
          <Button
            onClick={this.handleReset}
            className="bg-green-700 hover:bg-green-800 gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Recarregar página
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
