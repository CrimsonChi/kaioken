import { StyleScope } from "kaioken"

export function Spinner() {
  return (
    <StyleScope>
      <div className="spinner">
        <span className="bounce1" />
        <span className="bounce2" />
        <span className="bounce3" />
      </div>
      <style>
        {`
        .spinner {
          margin: 100px auto 0;
          width: 70px;
          text-align: center;
        }
        
        span {
          width: 18px;
          height: 18px;
          background-color: #333;
        
          border-radius: 100%;
          display: inline-block;
          -webkit-animation: sk-bounce 1.4s infinite ease-in-out both;
          animation: sk-bounce 1.4s infinite ease-in-out both;
        }
        
        .bounce1 {
          -webkit-animation-delay: -0.32s;
          animation-delay: -0.32s;
        }
        
        .bounce2 {
          -webkit-animation-delay: -0.16s;
          animation-delay: -0.16s;
        }
        
       
        @keyframes sk-bounce {
          0%,
          100% {
            transform: scale(0);
            -webkit-transform: scale(0);
          }
          50% {
            transform: scale(1);
            -webkit-transform: scale(1);
          }
        }
        `}
      </style>
    </StyleScope>
  )
}
