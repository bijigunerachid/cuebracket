import React,{useEffect,useState} from 'react';
import {Page,Btn} from '../src/ui';
import * as store from '../src/db';
import TournamentApp from '../src/screens/TournamentApp';

class DatabaseBoundary extends React.Component<React.PropsWithChildren,{error:string|null}> {
 state:{error:string|null}={error:null};
 static getDerivedStateFromError(error:unknown){return {error:error instanceof Error?error.message:String(error)}}
 render(){return this.state.error?<Page title="Unable to load tournaments" subtitle={this.state.error}><Btn title="Retry" onPress={()=>this.setState({error:null})}/></Page>:this.props.children}
}
export default function App(){return <DatabaseBoundary><DatabaseGate/></DatabaseBoundary>}
function DatabaseGate(){
 const [ready,setReady]=useState(false);
 const [error,setError]=useState<string|null>(null);
 const initialize=()=>{try{store.init();setError(null);setReady(true)}catch(e){setError(e instanceof Error?e.message:String(e))}};
 useEffect(initialize,[]);
 if(!ready)return <Page title={error?'Unable to open database':'Loading CueBracket'} subtitle={error??'Opening your offline tournaments...'}>{error?<Btn title="Retry" onPress={initialize}/>:null}</Page>;
 return <TournamentApp/>;
}
